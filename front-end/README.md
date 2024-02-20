# How to use

- Setup Environment
Anchor Install
Anchor Version : 0.26.0
Ref : https://www.anchor-lang.com/docs/installation 
Rust Install
Rust Version : 1.64.0
Ref : https://0xchai.io/blog/how-to-install-rust-solana-and-anchor 
Solana Install
Solana Version : 1.14.9
Ref : https://docs.solana.com/cli/install-solana-cli-tools 


- How to deploy solana program
Go to “solana_anchor” directory.
Run “anchor build” instruction.
In “target/deploy” folder, run “solana program deploy solana_anchor.so”.
You need to save deployed contract address after deployment.


- How to create pool for NFT & Token staking

1) Creating SPL-TOKEN
You will need spl-token for NFT & Token staking.
Run “spl-token create-token”. You will get spl-token address.
Run “spl-token create-account YOUR_SPL-TOKEN_ADDRESS”. This will create your spl-token account.
Run “spl-token mint YOUR_SPL-TOKEN_ADDRESS SPL-TOKEN_MINT_AMOUNT”. This will let you mint spl-token to your account.
Ex : “spl-token mint H2jXcXLXhuLdhac2DxNAqQ4yxLvRHbtMgMB2o2fyHjCf 1000000000”
Run “spl-token transfer YOUR_SPL-TOKEN_ADDRESS SPL-TOKEN_AMOUNT_FOR_TRANSFER STAKING_POOL_ADDRESS --fund-recipient  --allow-non-system-account-recipient”
Ex : “spl-token transfer H2jXcXLXhuLdhac2DxNAqQ4yxLvRHbtMgMB2o2fyHjCf 100000000  H8EwQVMruWJsFcvXm2bvf47ALUqNGHGXKeLyj8kvdLva --fund-recipient  --allow-non-system-account-recipient”

Ref : https://spl.solana.com/token

2) Creating Staking Pool
When users stake NFTs and Tokens, NFTs and Tokens will be transferred to solana program staking pool.
So you need to create staking pool for NFT & Token staking.
Script for Creating Staking Pool is in source folder.
Then, replace programId and REWARD_TOKEN respectively with the above token-staking contract address and spl-token address in the StakingPoolScript/src/pages/address.js .
Before running the script, node_module need to be installed, by running “npm install”.
And, you can run the script at the root directory of StakingPoolScript by running "npm start".
If you click “Create Staking Pool” button in website UI, you will get staking pool address.
Save this staking pool address.


- How to setup environment for staking UI
Go to “src/pages/address.js” of the project root directory.
Replace Solana Program address you deployed to programId variable.
Replace Staking Pool address you created to POOL variable.
Replace spl-token address you created to REWARD_TOKEN variable.

Go to project source folder, Start the project with “npm start” command.

When adding new collections for staking,
Now, there are 5 collections for Ubik NFTs.
If you want to add a new collection, you will need to change variables from “src/pages/address.js”.
totalNFTs = 1000 * 5; -> totalNFTs = 1000 * 6; (This is the number of total NFTs for 5 collections now)
export const totalNFTs = 1000 * 5;
to
export const totalNFTs = 1000 * 6;

add a new field to “collections” variable like below:
{ 
    address : 'New Creator’s Address',
    badge : 'New Collection Name',
},

When you want to start on mainnet,
Change a variable from address.js. 
export const conn = new Connection(clusterApiUrl('devnet'));
“devnet” to ”mainnet-beta”.


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
