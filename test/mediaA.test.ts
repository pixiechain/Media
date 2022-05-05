//npx hardhat node
//yarn test --network hard
import {ethers} from "hardhat";
import chai, { expect } from 'chai';
import asPromised from 'chai-as-promised';
import { JsonRpcProvider } from '@ethersproject/providers';
import { generatedWallets } from '../utils/generatedWallets';
import { Signer } from 'ethers';
import fs from 'fs-extra';
import * as factory from '../typechain';
import { BigNumber } from '@ethersproject/abi/node_modules/@ethersproject/bignumber';
import { getAddressBookShareFilePath } from '../address_config';

chai.use(asPromised);

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

describe('Project MediaA',  () => {

    let deployerWallet:Signer;
    let actor0Wallet:Signer;
    async function prepareSigners() {
        [deployerWallet, actor0Wallet] = await ethers.getSigners();
    }

    const sharedAddressPath = getAddressBookShareFilePath("hard");
    let addressBook = {};
    async function getContractAddress(){
        // @ts-ignore
        addressBook = JSON.parse(await fs.readFileSync(sharedAddressPath));
    }

    async function operateMediaAAs(wallet: Signer){return factory.MediaA__factory.connect(addressBook["MediaA"], wallet);}

    describe("Deploy", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("Deploy New", async ()=>{
            let baseURI = 'https://api.pixbe.com/nft-token-url-info/M22050508135647/';
            const deployTx = await (await new factory.MediaA__factory(deployerWallet).deploy("Media", "MEDIA", baseURI, { gasLimit: 5000000 })).deployed();
            addressBook["MediaA"] = deployTx.address;
            console.log(addressBook);
            await fs.writeFile(sharedAddressPath, JSON.stringify(addressBook, null, 2));
        }).timeout(30000);
    })

    describe("MediaA", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("mint100", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let nextId = await media.nextTokenId();
            console.log(`nextId=${nextId.toNumber()}`);
            let res = await media.mint(100);
            await expect(res.wait()).eventually.fulfilled;
            let uri = await media.tokenURI(nextId.add(99));
            console.log(`Media #100 uri:`);
            console.log(uri);
            nextId = await media.nextTokenId();
            console.log(`nextId=${nextId.toNumber()}`);
        }).timeout(30000);

        it("mintTo10", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let nextId = await media.nextTokenId();
            console.log(`nextId=${nextId.toNumber()}`);
            let creator = await actor0Wallet.getAddress();
            let res = await media.mintTo(creator, 10);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(nextId);
            await expect(c == creator);
            nextId = await media.nextTokenId();
            console.log(`nextId=${nextId.toNumber()}`);
        }).timeout(30000);

        it("transfer from not owner", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media["safeTransferFrom(address,address,uint256)"](creator, newOwner, 105);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(105);
            await expect(c == newOwner);
        }).timeout(30000);

        it("transfer from owner", async ()=>{
            const media = await operateMediaAAs(actor0Wallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media["safeTransferFrom(address,address,uint256)"](creator, newOwner, 105);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(105);
            await expect(c == newOwner);
        }).timeout(30000);

        it("approve to new one", async ()=>{
            const media = await operateMediaAAs(actor0Wallet);
            let newOne = await deployerWallet.getAddress();
            let res = await media.approve(newOne, 106);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.getApproved(106);
            await expect(c == newOne);
        }).timeout(30000);

        it("transfer from owner by new one approved", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media["safeTransferFrom(address,address,uint256)"](creator, newOwner, 106);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(106);
            await expect(c == newOwner);
        }).timeout(30000);

        it("mint10000", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let nextId = await media.nextTokenId();
            console.log(`nextId=${nextId.toNumber()}`);
            for(var i=0; i<10; i++) {
                let res = await media.mint(1000);
                await expect(res.wait()).eventually.fulfilled;
                nextId = await media.nextTokenId();
                console.log(`nextId=${nextId.toNumber()}`);
            }
            let uri = await media.tokenURI(nextId.sub(1));
            console.log(`Media #10110 uri:`);
            console.log(uri);
    }).timeout(30000);

        it("finalization", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let res = await media.finalize();
            await expect(res.wait()).eventually.fulfilled;

            let supply = await media.totalSupply();
            console.log(`Supply: ${supply}`);
        }).timeout(30000);

        it("mint after finalization", async ()=>{
            const media = await operateMediaAAs(deployerWallet);
            let res = await media.mint(1);
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);
    })
});