//use hardhat network to debug
//npx hardhat node
//npx hardhat run media_server.ts --network hard

//use ts-node
//TS_NODE_FILES=1 ts-node media_server.ts --network hard

import * as env from "hardhat";
import { ethers } from "hardhat";
import express, { Express, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import { BigNumber } from 'ethers'; //https://docs.ethers.io/v5/
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { Media__factory } from './typechain/factories/Media__factory';
import Decimal from './utils/Decimal';
import {
    approveCurrency,
    deployCurrency,
    EIP712Sig,
    getBalance,
    mintCurrency,
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

console.log("Pixie Media Server");

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
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
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
        const media = Media__factory.connect(address, wallet);
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
app.get('/api/v1/contracts/creatorOf', async (req, res) => {
    let address : any = req.query.media_address;
    let tokenId : any = req.query.token_id;
    let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
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
app.get('/api/v1/contracts/symbol', async (req, res) => {
    let address : any = req.query.address;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
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
        const media = Media__factory.connect(address, wallet);
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
app.get('/api/v1/contracts/tokenContentHashes', async (req, res) => {
    let address : any = req.query.contract_address;
	let tokenId : any = req.query.token_id;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
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
        const media = Media__factory.connect(address, wallet);
        const tokenURI = await media.tokenURI(tokenId);
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
app.get('/api/v1/contracts/tokenOfOwnerByIndex', async (req, res) => {
    let address : any = req.query.contract_address;
	let owner : any = req.query.owner;
	let index : any = req.query.index;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
        const id = await media.tokenOfOwnerByIndex(owner, index);

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] tokenOfOwnerByIndex(${address}:${owner}:${index}) => ${id}`);
		res.send({
			"id" : id.toNumber()
		});
    } catch(err) {
		res.send({
			err: err.toString()
		});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/v1/contracts/tokenByIndex', async (req, res) => {
    let address : any = req.query.contract_address;
	let index : any = req.query.index;
	let type = req.query.type;

    try {
		let provider = await ethers.provider;
        const wallet = new Wallet(voidPK, provider);
        const media = Media__factory.connect(address, wallet);
        const id = await media.tokenByIndex(index);

        var logTime = new Date();
	    console.log(`[${logTime.toLocaleTimeString()}] tokenByIndex(${address}:${index}) => ${id}`);
		res.send({
			"id" : id.toNumber()
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
    let tokenURI = req.body.tokenURI;
    let contentHash = req.body.contentHash;
    //let creatorShare = req.body.creatorShare;
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
        console.log(`[${logTime.toLocaleTimeString()}] MintForCreator ${tokenId} error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    //check if hash is exist
    try {
        const media = Media__factory.connect(contract_address, wallet);
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
            const media = Media__factory.connect(contract_address, wallet);
            let mediaData = {
                tokenURI: tokenURI,
                contentHash: Buffer.from(contentHash.slice(2), "hex")
            };
            // let bidShares = {
            //     prevOwner: Decimal.new(0),
            //     creator: Decimal.new(creatorShare),
            //     owner: Decimal.new(100 - creatorShare),
            // };
            tokenId = ethers.BigNumber.from(tokenId);

            if(creator_address == undefined || creator_address == "") {
                const gasPri = await wallet.getGasPrice();
                console.log("gasPrice=", gasPri.toString());
                const gasEstimate = await media.estimateGas.mint(tokenId, mediaData);
                console.log("gasEst=", gasEstimate.toString());
                const paddedEstimate = gasEstimate.mul(110).div(100);
                //const mintTx = await media.mint(mediaData, bidShares, { gasLimit: 5000000 });
                mintTx = await media.mint(tokenId, mediaData, { gasPrice: gasPri, gasLimit: paddedEstimate });
                mintTx.status = true;
                var logTime = new Date();
                console.log(`[${logTime.toLocaleTimeString()}] Mint TX: ${mintTx.hash}`);
                res.send(mintTx);
            }
            else {
                //代理模式
                const gasPri = await wallet.getGasPrice();
                console.log("gasPrice=", gasPri.toString());
                const gasEstimate = await media.estimateGas.mintForCreator(creator_address, tokenId, mediaData);
                console.log("gasEst=", gasEstimate.toString());
                const paddedEstimate = gasEstimate.mul(110).div(100);
                //const mintTx = await media.mintForCreator(creatorWallet.address, mediaData, bidShares, { gasLimit: 5000000 });
                mintTx = await media.mintForCreator(creator_address, tokenId, mediaData, { gasPrice: gasPri, gasLimit: paddedEstimate });
                mintTx.status = true;
                var logTime = new Date();
                console.log(`[${logTime.toLocaleTimeString()}] MintForCreator TX: ${mintTx.hash}`);
                res.send(mintTx);
            }
            // else {
            //     //代理模式
            //     const chain_id = getChainIdByType(type, isTestChain);
            //     const creatorWallet = new Wallet(`0x${creator_pk}`, provider);

            //     const sig = await signMintWithSig(
            //         creatorWallet,
            //         contract_address,
            //         creatorWallet.address,
            //         contentHash,
            //         Decimal.new(creatorShare).value.toString(),
            //         chain_id
            //     );

            //     console.log(sig);
            //     // const gasEstimate = await media.estimateGas.mintWithSig(creatorWallet.address, tokenId, mediaData, bidShares, sig);
            //     // const paddedEstimate = gasEstimate.mul(110).div(100);
            //     // console.log("!!",paddedEstimate);
            //     const mintTx = await media.mintWithSig(creatorWallet.address, tokenId, mediaData, bidShares, sig, { gasLimit: 5000000 });
            //     console.log('MintWithSig TX: ', mintTx.hash);
            //     let receipt = await mintTx.wait();
            //     var new_token_id = receipt.logs[0].topics[3];
            //     receipt["token_id"] = ethers.BigNumber.from(new_token_id).toString();
            //     console.log(`mintWithSig ${receipt["token_id"]} successfully!`);
            //     res.send(receipt);
            // }
        } catch(err) {
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] MintForCreator ${tokenId} error!`);
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
                console.log(`[${logTime.toLocaleTimeString()}] MintForCreator ${receipt["token_id"]} successfully!`);
            }
        } catch(err) {
            var time = new Date();
            console.log(`[${time.toLocaleTimeString()}] MintForCreator ${tokenId} failed!`);
            console.log(err.toString());
        };
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/mintPrice', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let tokenId = req.body.tokenId;
    let tokenURI = req.body.tokenURI;
    let contentHash = req.body.contentHash;
    //let creatorShare = req.body.creatorShare;
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
        console.log(`[${logTime.toLocaleTimeString()}] mintPrice ${tokenId} get the mint Price error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const media = Media__factory.connect(contract_address, wallet);
        let mediaData = {
            tokenURI: tokenURI,
            contentHash: Buffer.from(contentHash.slice(2), "hex")
        };
        // let bidShares = {
        //     prevOwner: Decimal.new(0),
        //     creator: Decimal.new(creatorShare),
        //     owner: Decimal.new(100 - creatorShare),
        // };
        tokenId = ethers.BigNumber.from(tokenId);

        if(creator_pk == undefined || creator_pk == "") {
            const gasPri = await wallet.getGasPrice();
            console.log("gasPrice=", gasPri.toString());
            const gasEstimate = await media.estimateGas.mint(tokenId, mediaData);
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
            const gasEstimate = await media.estimateGas.mintForCreator(creatorWallet.address, tokenId, mediaData);
            console.log("gasEst=", gasEstimate.toString());
            const paddedEstimate = gasEstimate.mul(110).div(100);
            let mintPrice = Number(gasPri) * Number(paddedEstimate);
            var logTime = new Date();
            console.log(`[${logTime.toLocaleTimeString()}] Mint Price: ${mintPrice}`);
            res.send({status:true, mintPrice: mintPrice});
        }
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintPrice ${tokenId} get the mint Price error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/signMintWithSig', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let creator_pk = req.body.creator_pk;
    let contentHash = req.body.contentHash;
    //let creatorShare = req.body.creatorShare;
    let type = req.body.type;
    const chain_id = getChainIdByType(type);

    let provider : any;
    let creatorWallet : any;
    try {
		provider = await ethers.provider;
        creatorWallet = new Wallet(`0x${creator_pk}`, provider);    
    } catch(err) {
        res.send({status:false, err:err.toString()});
        return;
    };

    try {
        const sig = await signMintWithSig(
            creatorWallet,
            contract_address,
            creatorWallet.address,
            contentHash,
            //Decimal.new(creatorShare).value.toString(),
            chain_id
        );

        console.log(sig);
        res.send({stauts:true,
            sig: {
                r: `0x${sig.r.toString("hex")}`,
                s: `0x${sig.s.toString("hex")}`,
                v: sig.v,
                deadline: sig.deadline
            }
        });
    } catch(err) {
        res.send({status:false, err:err.toString()});
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/mintWithSig', async (req, res) => {
    console.log(req.body);
    let contract_address : any = req.body.contract_address;
    let toAddress : any = req.body.toAddress;
    let tokenId = req.body.tokenId;
    let tokenURI = req.body.tokenURI;
    let contentHash = req.body.contentHash;
    //let creatorShare = req.body.creatorShare;
    let sig = req.body.sig;
    let pk = req.body.pk;
    let type = req.body.type;

    let provider : any;
    let wallet : any;
    try {
		provider = await ethers.provider;
        wallet = new Wallet(`0x${pk}`, provider);    
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintWithSig ${tokenId} error!`);
        res.send({status:false, err:err.toString()});
        return;
    };

    let mintTx : any;

    try {
        const media = Media__factory.connect(contract_address, wallet);
        let mediaData = {
            tokenURI: tokenURI,
            contentHash: Buffer.from(contentHash.slice(2), "hex"),
        };
        // let bidShares = {
        //     prevOwner: Decimal.new(0),
        //     creator: Decimal.new(creatorShare),
        //     owner: Decimal.new(100 - creatorShare),
        // };
        tokenId = ethers.BigNumber.from(tokenId);

        let data_sig : EIP712Sig = {
            r : Buffer.from(sig.r.slice(2), "hex"),
            s : Buffer.from(sig.s.slice(2), "hex"),
            v : sig.v,
            deadline : sig.deadline
        }

        // const gasEstimate = await media.estimateGas.mintWithSig(toAddress, mediaData, bidShares, data_sig);
        // const paddedEstimate = gasEstimate.mul(110).div(100);
        // console.log("!!",paddedEstimate);
        //const mintTx = await media.mintWithSig(toAddress, mediaData, bidShares, data_sig, { gasLimit: 5000000 });
        mintTx = await media.mintWithSig(toAddress, tokenId, mediaData, data_sig, { gasLimit: 5000000 });
        mintTx.status = true;
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintWithSig TX: ${mintTx.hash}`);
        res.send(mintTx);

    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintWithSig ${tokenId} error!`);
        res.send({status:false, err:err.toString()});
        return;
    };

    //继续跟踪交易获取日志
    try {
        let receipt = await mintTx.wait();
        var new_token_id = receipt.logs[0].topics[3];
        receipt["token_id"] = ethers.BigNumber.from(new_token_id).toString();
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintWithSig ${receipt["token_id"]} successfully!`);
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] mintWithSig ${tokenId} failed!`);
        console.log(err.toString());
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
            const media = Media__factory.connect(contract_address, wallet);
            trans_tx = await media.transferFrom(fromAddress, toAddress, tokenId, { gasLimit: 5000000 });
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
app.get('/api/v1/contracts/getMemoByTransactionHash', async (req, res) => {

	let type = req.query.type;
    let transactionHash : any = req.query.transactionHash;

    let provider = await ethers.provider;

    try {
        provider.getTransaction(transactionHash).then(function(transaction) {
            let memoData = transaction["data"];

            if (memoData) {
                memoData = memoData.toString().slice(2);

                var tmp_array = new Uint8Array(memoData.length / 2);
                for (let i = 0; i < memoData.length; i+=2) {
                    tmp_array[i/2] = parseInt("0x" + memoData.slice(i, i+2));
                }

                const decoder = new TextDecoder()
                let memo = decoder.decode(tmp_array);

                res.send(memo);
            } 
            else {
                res.send("");
            }
        });
    } catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] getMemoByTransactionHash failed!`);
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
        const media = Media__factory.connect(contract_address, wallet);
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
        const media = Media__factory.connect(contract_address, wallet);
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
        const media = Media__factory.connect(contractAddress, wallet);
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
            // "token_type" : token_type,
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
app.post('/api/v1/contracts/updateTokenURI', async (req, res) => {
    console.log(req.body);

    let type = req.body.type;
    let tokenId = req.body.tokenId;
    let contract_address : any = req.body.contract_address;
    let pk = req.body.pk;
    let tokenURI = req.body.tokenURI;

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
        const media = Media__factory.connect(contract_address, wallet);
        const update = await media.updateTokenURI(tokenId, tokenURI, { gasLimit: 20000000 });
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
        const media = Media__factory.connect(address, wallet);
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

const server = app.listen(31090, () => {
    let info : any = server.address();
    let host = info.address;
    let port = info.port;
    console.log('Http server listening at http://%s:%s', host, port);
});
