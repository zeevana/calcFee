const axios = require('axios');
const moment = require('moment');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function displayWelcomeMessage() {
    console.log("==========================================================");
    console.log("                      A I   D R O P                   ");
    console.log("==========================================================");
    console.log("Join:    https://t.me/ai_drop100");
    console.log("Github:  https://github.com/zeevana");
    console.log("==========================================================");
    console.log();
}

function calculateGasFee(gasUsed, gasPriceGwei) {
    const gasPriceWei = gasPriceGwei * 1e9;
    const gasFeeWei = gasUsed * gasPriceWei;
    const gasFeeEth = gasFeeWei / 1e18;
    return gasFeeEth;
}

async function getEthPrice() {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
        const response = await axios.get(url);

        if (!response.data || !response.data.ethereum || !response.data.ethereum.usd) {
            console.log('Gagal mendapatkan harga ETH.');
            return null;
        }

        return response.data.ethereum.usd;
    } catch (error) {
        console.error('Error fetching ETH price:', error.message);
        return null;
    }
}

async function getTransactionDataFromTaiko(address) {
    const chalk = await import('chalk');

    try {
        const now = moment();
        const startOfDay = now.clone().startOf('day');
        const startOfDayWib = startOfDay.clone().add('hours');
        const startOfDayTimestamp = startOfDayWib.unix();

        const url = `https://api.taikoscan.io/api?module=account&action=txlist&address=${address}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.result) {
            console.log(chalk.default.yellow('Tidak ada data transaksi ditemukan.'));
            return;
        }

        let totalGasFee = 0;
        let txCount = 0;

        response.data.result.forEach(tx => {
            const txTimestamp = parseInt(tx.timeStamp);

            if (tx.gasUsed && tx.gasPrice && txTimestamp >= startOfDayTimestamp) {
                const gasUsed = parseInt(tx.gasUsed);
                const gasPriceGwei = parseInt(tx.gasPrice);
                const gasFee = calculateGasFee(gasUsed, gasPriceGwei);
                totalGasFee += gasFee;
                txCount += 1;
            }
        });

        const ethToUsdRate = await getEthPrice();

        if (!ethToUsdRate) {
            console.log(chalk.default.red('Gagal mendapatkan harga ETH, perhitungan tidak dapat dilanjutkan.'));
            return;
        }

        const adjustedGasFeeInEth = totalGasFee / 1e9;
        const totalGasFeeInUsd = adjustedGasFeeInEth * ethToUsdRate;

        console.log();
        console.log(chalk.default.magenta('=========================================================='));
        console.log(chalk.default.green('                 Hasil Perhitungan Gas Fee            '));
        console.log(chalk.default.magenta('=========================================================='));
        console.log(chalk.default.white(`Total Gas Fee ETH  : ${adjustedGasFeeInEth.toFixed(10)} ETH`));
        console.log(chalk.default.white(`Total Gas Fee USD  : $${totalGasFeeInUsd.toFixed(2)}`));
        console.log('');
        console.log(chalk.default.white(`Jumlah tx hari ini : ${txCount} transaksi`));
        console.log(chalk.default.magenta('=========================================================='));
        console.log();

    } catch (error) {
        console.error(chalk.default.red('Error fetching transaction data:', error.message));
    }
}

displayWelcomeMessage();

rl.question('Alamat wallet : ', (address) => {
    rl.close();
    getTransactionDataFromTaiko(address);
});
