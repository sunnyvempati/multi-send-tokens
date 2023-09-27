const { ethers } = require('ethers');
const fs = require('fs');
const csv = require('csv-parser');

const FAKE_AMOUNT_TO_SEND = ethers.utils.parseUnits(100000, 18);

async function sendTokens(privateKey, tokenAddress, csvFilePath) {
  const provider = new ethers.providers.JsonRpcProvider(
    'https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY'
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  const erc20ABI = [
    'function transfer(address recipient, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
  ];
  const tokenContract = new ethers.Contract(
    tokenAddress,
    erc20ABI,
    provider
  ).connect(wallet);

  const recipients = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', row => {
        recipients.push(row.address);
      })
      .on('end', async () => {
        // double check balance
        const balance = await tokenContract.balanceOf(wallet.address);
        const totalToSend = ethers.BigNumber.from(recipients.length()).mul(FAKE_AMOUNT_TO_SEND);
        if (balance.lt(totalToSend)) {
          reject('Not enough tokens to send.');
          return;
        }

        recipients.forEach(address => {
          console.log(`Sending ${FAKE_AMOUNT_TO_SEND.toString()} tokens to ${address}...`);
          const tx = await tokenContract.transfer(address, FAKE_AMOUNT_TO_SEND);
          await tx.wait();
          console.log(
            `Successfully sent ${FAKE_AMOUNT_TO_SEND.toString()} tokens to ${address}.`
          );
        });

        console.log('All tokens sent successfully.');
        resolve();
      });
  });
}

const privateKey = 'PRIV_KEY';
// fSNX contract
const tokenAddress = 'TOKEN_CONTRACT_ADDRESS';
const csvFilePath = 'sampleLp.csv';

sendTokens(privateKey, tokenAddress, csvFilePath)
  .then(() => console.log('Done'))
  .catch(error => console.error(error));
