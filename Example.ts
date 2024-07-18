import 'dotenv/config';
import { ethers } from 'ethers';



const main = async () => {
    // Инициализация провайдера, подписанта и адресов контрактов
    const provider = new ethers.JsonRpcProvider("https://blastl2-mainnet.public.blastapi.io");
    const signer = new ethers.Wallet(process.env.ALICE_PRIVATE_KEY as string, provider);

    // Адреса контрактов
    const spaceStationAddress = "0x1E18C3cb491D908241D0db14b081B51be7B6e652";
    const oEtherAddress = "0x0872b71efc37cb8dde22b2118de3d800427fdba0";
    const oUSDBAddress = "0x9aECEdCD6A82d26F2f86D331B17a1C1676442A87";

    // ABI контрактов (импортируемые из JSON файлов)
    const SpaceStationABI = require('./spacestation_abi.json');
    const OTokenABI = require('./otoken_abi.json');
    const qwe = require('./token123.json');

    // Настройка контрактов
    const spaceStationContract = new ethers.Contract(spaceStationAddress, SpaceStationABI, signer);
    const oEtherContract = new ethers.Contract(oEtherAddress, qwe, signer);
    const oUSDBContract = new ethers.Contract(oUSDBAddress, qwe, signer);
    const usdbUnderlying = await oUSDBContract.underlying();
    const USDBContract = new ethers.Contract(usdbUnderlying, OTokenABI, signer);

    const balance = await provider.getBalance(signer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);



    // // Операция по займу (1 ETH) - Внесение средств и начисление APY
    // const lendTx = await oEtherContract.mint({ value: ethers.parseEther("0.001") });
    //
    // await lendTx.wait(); console.log('ETH successfully lent.');

    // Включение ETH в качестве залога
    // const enableCollateralTx = await spaceStationContract.enterMarkets([oEtherAddress]);
    // await enableCollateralTx.wait(); console.log('Collateral enabled.');

    // Операция по займу (1 USDB)
    // const borrowTx = await oUSDBContract.borrow(ethers.parseUnits('1', 18));
    // await borrowTx.wait();console.log('1 USDB borrowed.');
    //
    // // Отслеживание позиции LTV
    const liquidityData = await spaceStationContract.getAccountLiquidity(signer.address);
    const liquidity = liquidityData[1]; // Предполагая, что второе значение - это ликвидность
    console.log(`Liquidity: ${liquidity / BigInt(10 ** 18)}`,"%");


    // Процесс погашения (включая начисленные проценты)
    const owedAmount = (await oUSDBContract.getAccountSnapshot(signer.address))[2];
    console.log(`Owed Amount: ${owedAmount / BigInt(10 ** 18)}`);
    console.log(`Owed Amount: ${owedAmount }`);
    const approveTx = await USDBContract.approve(oUSDBAddress, owedAmount);
    await approveTx.wait();

    // Проверка текущего аллоуенса
    const currentAllowance = await oUSDBContract.allowance(signer.address, oUSDBAddress);
    if (currentAllowance < owedAmount) {
        const approveTx = await oUSDBContract.approve(oUSDBAddress, owedAmount);
        await approveTx.wait();
    }


    const repayTx = await oUSDBContract.repayBorrow(owedAmount);
    await repayTx.wait();
    console.log('Borrow successfully repaid.');

    // Вывод залога (ETH)
    const withdrawTx = await oEtherContract.redeemUnderlying( ethers.parseEther("0.001"));
    await withdrawTx.wait();console.log('Collateral successfully withdrawn.');
}

main().catch(console.error);
