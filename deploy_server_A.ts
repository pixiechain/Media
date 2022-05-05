//use hardhat network to debug
//npx hardhat node
//npx hardhat run deploy_server.ts --network hard

//use ts-node
//TS_NODE_FILES=1 ts-node deploy_server.ts --network hard

import * as env from "hardhat";
import { ethers } from "hardhat";
import express, { Express, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import { BigNumber } from 'ethers'; //https://docs.ethers.io/v5/
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { MediaA__factory } from './typechain/factories/MediaA__factory';
import { Media1155__factory } from './typechain/factories/Media1155__factory';
import Decimal from './utils/Decimal';
import {
    arrayify,
    formatBytes32String,
    parseBytes32String,
    formatUnits,
    sha256,
} from 'ethers/lib/utils';
import { keccak256 } from '@ethersproject/keccak256';
//import { json } from 'stream/consumers';

console.log("Pxbee MediaA Contract Deploy Server");

const app: Express = express();
app.use(bodyParser.json() as RequestHandler);
app.use(bodyParser.urlencoded({ extended: false }) as RequestHandler);
// app.use(bodyParser.urlencoded({extended: false}));
// app.use(bodyParser.json());

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/deploy', async (req, res) => {
    console.log(req.body);
    req.body = req.body?req.body:{};
	var name = req.body.name?req.body.name:"";
	var symbol = req.body.symbol?req.body.symbol:"";
	var baseURI = req.body.baseURI?req.body.baseURI:"";

	if(name == "" || symbol == "" || baseURI == "") {
		let e = "can not deploy new contract without name, symbol and baseURI ";
        console.warn(e);
        res.send({status:false, err:e});
        return;
	}

    var logTime = new Date();
    console.log(`[${logTime.toLocaleTimeString()}] new MediaA contract for ${name}(${symbol}, ${baseURI})`);

    try {
		let provider = await ethers.provider;
		const [wallet] = await ethers.getSigners();
		const deployTx = await (await new MediaA__factory(wallet).deploy(name, symbol, baseURI, { gasLimit: 5000000 })).deployed();
		logTime = new Date();
		console.log(`[${logTime.toLocaleTimeString()}] MediaA ${name}(${symbol}, ${baseURI}) has been deployed at ${deployTx.address}.`);

		res.send({
            "status" : true,
			"name" : name,
			"symbol" : symbol,
            "baseURI" : baseURI,
			"address" : deployTx.address
		});
        return;
	} catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] deploy ${name}(${symbol}) error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
    };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/api/v1/contracts/deploy1155', async (req, res) => {
    console.log(req.body);
    req.body = req.body?req.body:{};

    var logTime = new Date();
    console.log(`[${logTime.toLocaleTimeString()}] new Media1155 contract...`);

    try {
		let provider = await ethers.provider;
		const [wallet] = await ethers.getSigners();
		const deployTx = await (await new Media1155__factory(wallet).deploy({ gasLimit: 5000000 })).deployed();
		logTime = new Date();
		console.log(`[${logTime.toLocaleTimeString()}] Media1155 has been deployed at ${deployTx.address}.`);

		res.send({
            "status" : true,
			"address" : deployTx.address
		});
        return;
	} catch(err) {
        var logTime = new Date();
        console.log(`[${logTime.toLocaleTimeString()}] deploy1155 error!`);
        console.log(err.toString());
        res.send({status:false, err:err.toString()});
        return;
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

const server = app.listen(31190, () => {
	let info : any = server.address();
	let host = info.address;
	let port = info.port;
	console.log('Http server listening at http://%s:%s', host, port);
});
	