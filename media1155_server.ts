//use hardhat network to debug
//npx hardhat node
//npx hardhat run media1155_server.ts --network hard

//use ts-node
//TS_NODE_FILES=1 ts-node media1155_server.ts --network hard

import * as env from "hardhat";
import { ethers } from "hardhat";
import express, { Express, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import { BigNumber } from 'ethers'; //https://docs.ethers.io/v5/
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { Media1155__factory } from './typechain/factories/Media1155__factory';
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

console.log("Pixie Media1155 Server");

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
    let tokenId : any = req.query.tokenId;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media1155__factory.connect(address, wallet);
        const supply = await media.totalSupply(tokenId);

        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] getTotalSupply(${address}) => ${supply.toString()}`);

	    res.send(supply.toString());
    } catch(err) {
        console.error(err.toString());
	    res.send("0");
    };
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/creatorOf', async (req, res) => {
    let address : any = req.query.media_address;
    let tokenId : any = req.query.token_id;
    let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media1155__factory.connect(address, wallet);
        const creator = await media.creatorOf(tokenId);

        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] creatorOf(${address}:${tokenId}) =>${creator}`);
        res.send({
            "address" : creator
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
        const media = Media1155__factory.connect(address, wallet);
        const uri = await media.uri(tokenId);

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
app.get('/api/v1/contracts/tokenContentHashes', async (req, res) => {
    let address : any = req.query.contract_address;
	let tokenId : any = req.query.token_id;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media1155__factory.connect(address, wallet);
        const hash = await media.tokenContentHashes(tokenId);

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] tokenContentHashes(${address}:${tokenId}) => ${hash}`);
		res.send({
			"tokenContentHashes" : hash
		});
    } catch(err) {
		res.send({
			err: err.toString()
		});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/tokenMediaInfo', async (req, res) => {
    let address : any = req.query.contract_address;
	let tokenId : any = req.query.token_id;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media1155__factory.connect(address, wallet);
        const tokenURI = await media.uri(tokenId);
        const contentHash = await media.tokenContentHashes(tokenId);

		res.send({
			"tokenURI" : tokenURI,
            "contentHash": contentHash
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
    let tokenId = req.body.tokenId;
    let amount = req.body.amount;
    let contentHash = req.body.contentHash;
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
        console.log(`[${logTime.toLocaleTimeString()}] Media1155 MintForCreator ${tokenId} error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    //check if hash is exist
    try {
        const media = Media1155__factory.connect(contract_address, wallet);
        const _tokenId = await media.getTokenIdByContentHash(contentHash);
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mint check find tokenId ${_tokenId} with same hash is aready exist.`);
        console.log(`return tokenId immediatelly.`)
		res.send({
            "status" : 1,
			"token_id" : _tokenId.toString()
		});
        return;
    } catch(err) {
        let mintTx : any;
        //continue mint
        try {
            const media = Media1155__factory.connect(contract_address, wallet);
            contentHash = Buffer.from(contentHash.slice(2), "hex");
            tokenId = ethers.BigNumber.from(tokenId);
            amount = ethers.BigNumber.from(amount);

            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mintForCreator(creator_address, tokenId, contentHash, amount);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            //const mintTx = await media.mintForCreator(creatorWallet.address, mediaData, bidShares, { gasLimit: 5000000 });
            mintTx = await media.mintForCreator(creator_address, tokenId, contentHash, amount, { gasPrice: gasPri, gasLimit: paddedEstimate });
            mintTx.status = true;
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Media1155 MintForCreator TX: ${mintTx.hash}`);
            res.send(mintTx);
        } catch(err) {
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Media1155 MintForCreator ${tokenId} error!`);
            console.log(err.toString());
            res.send({status:false, err:err.toString()});
            return;
        };

        //继续跟踪交易获取日志
        try {
            let receipt = await mintTx.wait();
            var to = receipt.logs[0].topics[3];
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Media1155 MintForCreator ${to} successfully!`);
        } catch(err) {
            var time = new Date();
            console.log(`[${time.toLocaleTimeString()}] Media1155 MintForCreator ${tokenId} failed!`);
            console.log(err.toString());
        };
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/mintPrice', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let tokenId = req.body.tokenId;
    let amount = req.body.amount;
    let contentHash = req.body.contentHash;
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
        console.log(`[${logTime.toLocaleTimeString()}] mintPrice ${tokenId} get the mint Price error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = Media1155__factory.connect(contract_address, wallet);
        contentHash = Buffer.from(contentHash.slice(2), "hex")
        tokenId = ethers.BigNumber.from(tokenId);
        amount = ethers.BigNumber.from(amount);

        const gasPri = await wallet.getGasPrice();
        console.log("gasPrice=", gasPri.toString());
        const gasEstimate = await media.estimateGas.mintForCreator(creator_address, tokenId, contentHash, amount);
        console.log("gasEst=", gasEstimate.toString());
        const paddedEstimate = gasEstimate.mul(110).div(100);
        let mintPrice = Number(gasPri) * Number(paddedEstimate);
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] Mint1155 Price: ${mintPrice}`);
        res.send({status:true, mintPrice: mintPrice});
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] Media1155 mintPrice ${tokenId} get the mint Price error!`);
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
        const media = Media1155__factory.connect(contract_address, wallet);
        let memoData = ""
        if (memo) {
            memoData = "0x";
            const encoder = new TextEncoder()
            let memo_utf8 = encoder.encode(memo);
            for (let i = 0; i < memo_utf8.length; i++) {
                let tmp_data = memo_utf8[i].toString(16);
                if (tmp_data.length == 1) {
                    memoData += "0"
                }
                memoData += tmp_data;
            }
        }
        trans_tx = await media.safeTransferFrom(fromAddress, toAddress, tokenId, amount, memoData, { gasLimit: 5000000 });
        let receipt = await trans_tx.wait();

        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] transfer ${tokenId} successfully!`);
        res.send(receipt);
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
    let amount = req.body.amount;
    let tokenId = req.body.tokenId;
    let account_address : any = req.body.account_address;
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
        const media = Media1155__factory.connect(contract_address, wallet);
        const burn_res = await media.burn(account_address, tokenId, amount, { gasLimit: 5000000 });
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
app.post('/api/v1/contracts/updateURI', async (req, res) => {
    console.log(req.body);

    let type = req.body.type;
    let tokenId = req.body.tokenId;
    let contract_address : any = req.body.contract_address;
    let pk = req.body.pk;
    let baseURI = req.body.baseURI;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] update token ${tokenId} token URI failed!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = Media1155__factory.connect(contract_address, wallet);
        const update = await media.setURI(baseURI, { gasLimit: 20000000 });
        let receipt = await update.wait();
        receipt["token_id"] = tokenId;
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] update token ${tokenId} token URI successfully!`);
        res.send(receipt);

    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] update token ${tokenId} token URI failed!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/tokenIdByContentHash', async (req, res) => {
	let type = req.query.type;
    let address: any = req.query.contractAddress
    let contentHash: any = req.query.contentHash

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(voidPK, provider);    
    } catch(err) {
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = Media1155__factory.connect(address, wallet);
        const tokenId = await media.getTokenIdByContentHash(contentHash);
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] tokenIdByContentHash(${address}:${contentHash}) => ${tokenId}`);
		res.send({
			"tokenId" : tokenId.toString()
		});
    } catch(err) {
        res.send({status:false, err:err.toString()});
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

const server = app.listen(31290, () => {
    let info : any = server.address();
    let host = info.address;
    let port = info.port;
    console.log('Http server listening at http://%s:%s', host, port);
});
