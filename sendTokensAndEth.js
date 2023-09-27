const { ethers } = require('ethers');
const fs = require('fs');
const csv = require('csv-parser');

const AMOUNT_OF_TOKENS_TO_SEND = ethers.utils.parseUnits('100000', 18);
const AMOUNT_OF_ETH_TO_SEND = ethers.utils.parseUnits('0.1', 18);

async function sendTokensAndEth(privateKey, tokenAddress, csvFilePath) {
  const provider = new ethers.providers.JsonRpcProvider(
    'https://mainnet.infura.io/v3/KEY'
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
        recipients.push({
          address: row.address,
          needsEth: row.needsEth.toLowerCase() === 'yes',
        });
      })
      .on('end', async () => {
        // Confirm enough balance for both tokens and ETH
        const tokenBalance = await tokenContract.balanceOf(wallet.address);
        const totalTokenToSend = amounts.reduce(
          (a, b) => a.add(b),
          ethers.BigNumber.from(0)
        );

        if (tokenBalance.lt(totalTokenToSend)) {
          reject('Not enough tokens to send.');
          return;
        }

        const ethAmountToSend = ethers.utils.parseEther('0.1');
        const ethToSendCount = sendEthList.filter(val => val).length;
        const totalEthToSend = ethAmountToSend.mul(ethToSendCount);
        const ethBalance = await provider.getBalance(wallet.address);

        if (ethBalance.lt(totalEthToSend)) {
          reject('Not enough ETH to send.');
          return;
        }

        recipients.forEach(({ address, needsEth }) => {
          console.log(`Sending ${AMOUNT_OF_TOKENS_TO_SEND.toString()} tokens to ${address}...`);
          const tokenTx = await tokenContract.transfer(
            address,
            AMOUNT_OF_TOKENS_TO_SEND
          );
          await tokenTx.wait();
          console.log(
            `Successfully sent ${AMOUNT_OF_TOKENS_TO_SEND.toString()} tokens to ${address}.`
          );

          if (needsEth) {
            console.log(`----Sending 0.1 ETH to ${address}...`);
            const ethTx = await wallet.sendTransaction({
              to: address,
              value: AMOUNT_OF_ETH_TO_SEND,
            });
            await ethTx.wait();
            console.log(`Successfully sent ${AMOUNT_OF_ETH_TO_SEND.toString()} ETH to ${address}.`);
          }
        });

        console.log('All tokens and ETH sent successfully.');
        resolve();
      });
  });
}

const privateKey = 'PRIV_KEY';
const tokenAddress = 'ADDY';
const csvFilePath = 'sample.csv';

sendTokensAndEth(privateKey, tokenAddress, csvFilePath)
  .then(() => console.log('Done'))
  .catch(error => console.error(error));
