//use hardhat network to debug
//npx hardhat node
//npx hardhat run media_server_A.ts --network hard

//use ts-node
//TS_NODE_FILES=1 ts-node media_server_A.ts --network hard

import * as env from "hardhat";
import { ethers } from "hardhat";
import express, { Express, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import { BigNumber } from 'ethers'; //https://docs.ethers.io/v5/
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { MediaA__factory } from './typechain/factories/MediaA__factory';
import Decimal from './utils/Decimal';
import {
    EIP712Sig,
    signMintWithSig,
    signPermit,
    toNumWei
} from './utils/utils';
import {
    arrayify,
    formatBytes32String,
    parseBytes32String,
    formatUnits,
    sha256,
} from 'ethers/lib/utils';
import { keccak256 } from '@ethersproject/keccak256';
//import { json } from 'stream/consumers';

console.log("Pxbee MediaA Server");

const app: Express = express();
app.use(bodyParser.json() as RequestHandler);
app.use(bodyParser.urlencoded({ extended: false }) as RequestHandler);
// app.use(bodyParser.urlencoded({extended: false}));
// app.use(bodyParser.json());

const voidPK = `0x5f6a52cd1b437e9388183c350f2519e16e9cde894245b08165de6a9a0ad3ca05`;
const testnetNFTMintPK = '4197fedd3febad4df4afa1bc370de9c6e64b2b764735f3bb1f269182c67a27a6';

function getChainIdByType(type) {
    if(type == "pixie")
        return 6626;
    else if(type == "pixie_test")
        return 666;
    else if(type == "polygon_test")
        return 80001;
    else if(type == "polygon")
        return 137;
    else if(type == "eth")
        return 1;
    else if(type == "hard")
        return 256;
    else
        return 256;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/newAccount', (req, res) => {
    req.body = req.body?req.body:{};
	var chain_type = req.body.type?req.body.type:"eth";
	var words = req.body.words;

    var logTime = new Date();
    console.log(`[${logTime.toLocaleTimeString()}] newAccount for ${chain_type}`);

	var acc = Wallet.createRandom(words);

	res.send({
		account: acc.address,
		type: chain_type,
		pk: acc.privateKey,
        mnemonic: acc.mnemonic.phrase
	});
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/getBalanceOf', async (req, res) => {
    let address : any = req.query.address;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const signer = new ethers.VoidSigner(address, provider);
        let tokens = await signer.getBalance();
        res.send(ethers.utils.formatEther(tokens));
    } catch(err) {
        console.error(err.toString());
	    res.send("0");
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/getTotalSupply', async (req, res) =>{
    let address : any = req.query.address;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = MediaA__factory.connect(address, wallet);
        const supply = await media.totalSupply();

        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] getTotalSupply(${address}) => ${supply.toString()}`);

	    res.send(supply.toString());
    } catch(err) {
        console.error(err.toString());
	    res.send("0");
    };
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/ownerOf', async (req, res) => {
    let address : any = req.query.contract_address;
	let tokenId : any = req.query.token_id;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = MediaA__factory.connect(address, wallet);
        const owner = await media.ownerOf(tokenId);

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] ownerOf(${address}:${tokenId}) =>${owner}`);
		res.send({
			"address" : owner
		});
    } catch(err) {
		res.send({
			err: err.toString()
		});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/symbol', async (req, res) => {
    let address : any = req.query.address;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = MediaA__factory.connect(address, wallet);
        const symbol = await media.symbol();

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] symbol(${address}) => ${symbol}`);
		res.send({
			"symbol" : symbol
		});
    } catch(err) {
		res.send({
			err: err.toString()
		});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/tokenURI', async (req, res) => {
    let address : any = req.query.contract_address;
	let tokenId : any = req.query.token_id;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = MediaA__factory.connect(address, wallet);
        const uri = await media.tokenURI(tokenId);

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] tokenURI(${address}:${tokenId}) => ${uri}`);
		res.send({
			"tokenURI" : uri
		});
    } catch(err) {
		res.send({
			err: err.toString()
		});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/mint', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let quantity = req.body.quantity;
    let creator_address = req.body.creator_address;
    let pk = req.body.pk;
    let type = req.body.type;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mint ${quantity} tokens error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    let mintTx : any;
    try {
        const media = MediaA__factory.connect(contract_address, wallet);

        if(creator_address == undefined || creator_address == "") {
            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mint(quantity);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            mintTx = await media.mint(quantity, { gasPrice: gasPri, gasLimit: paddedEstimate });
            mintTx.status = true;
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Mint TX: ${mintTx.hash}`);
            res.send(mintTx);
        }
        else {
            //代理模式
            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mintTo(creator_address, quantity);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            mintTx = await media.mintTo(creator_address, quantity, { gasPrice: gasPri, gasLimit: paddedEstimate });
            mintTx.status = true;
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] MintTO TX: ${mintTx.hash}`);
            res.send(mintTx);
        }
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] Mint ${quantity} tokens error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    //继续跟踪交易获取日志
    try {
        if(creator_address == undefined || creator_address == "") {
            let receipt = await mintTx.wait();
            var new_token_id = receipt.logs[0].topics[3];
            receipt["token_id"] = ethers.BigNumber.from(new_token_id).toString();
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Mint ${receipt["token_id"]} successfully!`);
        }
        else {
            //代理模式
            let receipt = await mintTx.wait();
            var new_token_id = receipt.logs[0].topics[3];
            receipt["token_id"] = ethers.BigNumber.from(new_token_id).toString();
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] MintTo ${receipt["token_id"]} successfully!`);
        }
    } catch(err) {
        var time = new Date();
        console.log(`[${time.toLocaleTimeString()}] Mint ${quantity} tokens failed!`);
        console.log(err.toString());
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/mintPrice', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let quantity = req.body.quantity;
    let creator_pk = req.body.creator_pk;
    let pk = req.body.pk;
    let type = req.body.type;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintPrice ${quantity} tokens get the mint Price error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = MediaA__factory.connect(contract_address, wallet);

        if(creator_pk == undefined || creator_pk == "") {
            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mint(quantity);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            let mintPrice = Number(gasPri) * Number(paddedEstimate);
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Mint Price: ${mintPrice}`);
            res.send({status:true, mintPrice: mintPrice});
        }
        else {
            //代理模式
            const creatorWallet = new Wallet(`0x${creator_pk}`, provider);
            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mintTo(creatorWallet.address, quantity);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            let mintPrice = Number(gasPri) * Number(paddedEstimate);
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Mint Price: ${mintPrice}`);
            res.send({status:true, mintPrice: mintPrice});
        }
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintPrice ${quantity} tokens get the mint Price error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/transfer', async (req, res) => {
    console.log(req.body);

    let type = req.body.type;
    let amount = req.body.amount;
    let tokenId = req.body.tokenId;
    let contract_address : any = req.body.contract_address;
    let toAddress : any = req.body.toAddress;
    let fromAddress : any = req.body.fromAddress;
    let pk = req.body.pk;
    let memo = req.body.memo;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] transfer failed!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        var trans_tx;
        if (amount) {
            let transferValue = "0x" + amount.toString(16);
            if (memo) {
                const encoder = new TextEncoder()
                let memo_utf8 = encoder.encode(memo);
                let memoData = "0x"
                for (let i = 0; i < memo_utf8.length; i++) {
                    let tmp_data = memo_utf8[i].toString(16);
                    if (tmp_data.length == 1) {
                        memoData += "0"
                    }
                    memoData += tmp_data;
                }

                let tx = {
                    to: toAddress, 
                    value: transferValue,
                    data: memoData
                };
                const gasPri = await wallet.getGasPrice();
                console.log("gasPrice=", gasPri.toString());
                const gasEstimate = await wallet.estimateGas(tx);                
                console.log("gasEst=", gasEstimate.toString());
                trans_tx = wallet.sendTransaction({to: toAddress, value: transferValue, data: memoData, gasPrice: gasPri, gasLimit: gasEstimate})
            } 
            else {
                let tx = {
                    to: toAddress, 
                    value: transferValue
                };
                const gasPri = await wallet.getGasPrice();
                console.log("gasPrice=", gasPri.toString());
                const gasEstimate = await wallet.estimateGas(tx);                
                console.log("gasEst=", gasEstimate.toString());
                trans_tx = wallet.sendTransaction({to: toAddress, value: transferValue, gasPrice: gasPri, gasLimit: gasEstimate})
            }
            
            trans_tx.then((receipt)=>{
                receipt.status = true;

                var logTime = new Date();
                console.log(`[${logTime.toLocaleTimeString()}] ${fromAddress} transfer ${amount} to ${toAddress} successfully!`);
                res.send(receipt);
            }).catch((err) => {
                var logTime = new Date();
                console.log(`[${logTime.toLocaleTimeString()}] transfer failed!`);
                console.log(err.toString());        
                res.send({status:false, err:err.toString()});
            });
        } 
        else {
            const media = MediaA__factory.connect(contract_address, wallet);
            trans_tx = await media["safeTransferFrom(address,address,uint256)"](fromAddress, toAddress, tokenId, { gasLimit: 5000000 });
            let receipt = await trans_tx.wait();

            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] transfer ${tokenId} successfully!`);
            res.send(receipt);
        }
    } 
    catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] transfer failed!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/burn', async (req, res) => {
    console.log(req.body);

    let type = req.body.type;
    // let amount = req.body.amount;
    let tokenId = req.body.tokenId;
    let contract_address : any = req.body.contract_address;
    let pk = req.body.pk;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = MediaA__factory.connect(contract_address, wallet);
        const burn_res = await media.burn(tokenId, { gasLimit: 5000000 });
        let receipt = await burn_res.wait();
        receipt["token_id"] = tokenId;
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] burn ${tokenId} successfully!`);
        res.send(receipt);

    } catch(err) {
        res.send({status:false, err:err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/finalize', async (req, res) => {
    let type = req.body.type;
    let contract_address : any = req.body.contract_address;
    let pk = req.body.pk;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = MediaA__factory.connect(contract_address, wallet);
        const finalize_res = await media.finalize({ gasLimit: 5000000 });
        let receipt = await finalize_res.wait();
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] finalize ${contract_address} successfully!`);
        res.send(receipt);

    } catch(err) {
        res.send({status:false, err:err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/info', async (req, res) => {
	let type = req.query.type;
    let contractAddress : any = req.query.contractAddress;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(voidPK, provider);    
    } catch(err) {
		res.send({ err: err.toString() });
        return;
    };

    try {
        const media = MediaA__factory.connect(contractAddress, wallet);
        const name = await media.name();
        const symbol = await media.symbol();
        const supply = await media.totalSupply();
        const owner = media.signer["address"];
        const address = contractAddress;
        // const txn =  media.deployTransaction;
        // let m = new Media__factory();
        // const txn = m.getDeployTransaction(contractAddress);

		res.send({
			"name" : name,
            "symbol" : symbol,
            "supply" : supply.toString(),
            "burnable" : 1,
            "mintable" : 1,
            "deploy" : 1,
            "address" : address,
            "owner" : owner
		});
    } catch(err) {
		res.send({err: err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/mintStatus', async (req, res) => {
	let type = req.query.type;
    let tx: any = req.query.tx;
    let provider = await ethers.provider;

    try {
        let receipt = await provider.getTransactionReceipt(tx);

        if (receipt !== null) {
            console.log(receipt);
            if(receipt.status == 1 && receipt.logs[0]!=undefined) {
                var new_token_id = receipt.logs[0].topics[3];
                receipt["token_id"] = ethers.BigNumber.from(new_token_id).toString();
                var logTime = new Date();
                console.log(`[${logTime.toLocaleTimeString()}] mintStatus: mint ${receipt["token_id"]} successfully!`);
            }
            res.send(receipt);
        }
        else {
            res.send({status:false});
        }
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintStatus failed!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
    };
});
//////////////////////////////////////////////////////////////////////////////////////////////////////
app.use(async (err, req, res, next)=>{
    let err_msg = err.toString();
    let flag = err_msg.startsWith("Error: Transaction hash mismatch from Provider.sendTransaction.")
    if (flag) {
		let provider = await ethers.provider;
        let tx_hash = err_msg.split("returnedHash=")[1].split('"')[1]
        provider.waitForTransaction(tx_hash).then(result=>{
            res.send({result})
        });

    } else {
        res.send({
            err: err.toString()
        });
    }
})
//////////////////////////////////////////////////////////////////////////////////////////////////////

const args = require('minimist')(process.argv.slice(2));

if (args.network) {
	env.changeNetwork(args.network);
}

const server = app.listen(41090, () => {
    let info : any = server.address();
    let host = info.address;
    let port = info.port;
    console.log('Http server listening at http://%s:%s', host, port);
});
