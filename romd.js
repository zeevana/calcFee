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
    console.log("Join  :  https://t.me/ai_drop100");
    console.log("Github:  https://github.com/zeevana");
    console.log("==========================================================");
    console.log();
}

function calculateGasFee(gasUsed, gasPriceGwei) {
    const gasPriceWei = gasPriceGwei * 1e9;
    const gasFeeWei = gasUsed * gasPriceWei;
    return gasFeeWei / 1e18;
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
        const now = moment.utc();
        const startOfTodayTimestamp = now.clone().startOf('day').unix();
        const startOfPeriodTimestamp = moment.utc("2024-09-16").unix();

        const url = `https://api.taikoscan.io/api?module=account&action=txlist&address=${address}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.result) {
            console.log(chalk.default.yellow('Tidak ada data transaksi ditemukan.'));
            return;
        }

        let totalGasFee = 0;
        let txCountToday = 0;
        let totalGasFeeFromSep16 = 0;
        let txCountFromSep16 = 0;

        response.data.result.forEach(tx => {
            const txTimestamp = parseInt(tx.timeStamp);

            if (tx.gasUsed && tx.gasPrice) {
                const gasUsed = parseInt(tx.gasUsed);
                const gasPriceGwei = parseInt(tx.gasPrice);
                const gasFee = calculateGasFee(gasUsed, gasPriceGwei);

                if (txTimestamp >= startOfTodayTimestamp) {
                    totalGasFee += gasFee;
                    txCountToday += 1;
                }

                if (txTimestamp >= startOfPeriodTimestamp) {
                    totalGasFeeFromSep16 += gasFee;
                    txCountFromSep16 += 1;
                }
            }
        });

        const ethToUsdRate = await getEthPrice();

        if (!ethToUsdRate) {
            console.log(chalk.default.red('Gagal mendapatkan harga ETH, perhitungan tidak dapat dilanjutkan.'));
            return;
        }

        const adjustedGasFeeInEthToday = totalGasFee / 1e9;
        const totalGasFeeInUsdToday = adjustedGasFeeInEthToday * ethToUsdRate;

        const adjustedGasFeeInEthFromSep16 = totalGasFeeFromSep16 / 1e9;
        const totalGasFeeInUsdFromSep16 = adjustedGasFeeInEthFromSep16 * ethToUsdRate;

        console.log();
        console.log(chalk.default.magenta('=========================================================='));
        console.log(chalk.default.green('                 Hasil Perhitungan Gas Fee            '));
        console.log(chalk.default.magenta('=========================================================='));
        console.log(chalk.default.white(`Gas Fee ETH (Hari Ini)  : ${adjustedGasFeeInEthToday.toFixed(10)} ETH`));
        console.log(chalk.default.white(`Gas Fee USD (Hari Ini)  : $${totalGasFeeInUsdToday.toFixed(2)}`));
        console.log('');
        console.log(chalk.default.white(`Jumlah tx Hari Ini : ${txCountToday} transaksi`));
        console.log('');
        console.log(chalk.default.white(`Total Gas Fee ETH TAIKO S2   : ${adjustedGasFeeInEthFromSep16.toFixed(10)} ETH`));
        console.log(chalk.default.white(`Total Gas Fee USD TAIKO S2   : $${totalGasFeeInUsdFromSep16.toFixed(2)}`));
        console.log('');
        console.log(chalk.default.white(`Jumlah tx TAIKO S2  : ${txCountFromSep16} transaksi`));
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
