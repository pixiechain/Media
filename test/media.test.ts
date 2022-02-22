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

describe('Project Media',  () => {

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

    async function operateMediaAs(wallet: Signer){return factory.Media__factory.connect(addressBook["Media"], wallet);}

    describe("Deploy", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("Deploy New", async ()=>{
            const deployTx = await (await new factory.Media__factory(deployerWallet).deploy("Media", "MEDIA", { gasLimit: 5000000 })).deployed();
            addressBook["Media"] = deployTx.address;
            console.log(addressBook);
            await fs.writeFile(sharedAddressPath, JSON.stringify(addressBook, null, 2));
        }).timeout(30000);
    })

    describe("Media", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("mint", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let res = await media.mint(123,
                {
                    "tokenURI":"http://api-test.pxbee.com/test/a/c/money?id=abcdedffafd",
                    "contentHash":"0xC27661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C"
                });
            await expect(res.wait()).eventually.fulfilled;
            let uri = await media.tokenURI(123);
            console.log(`Media #123 uri:`);
            console.log(uri);
        }).timeout(30000);

        it("mint for creator", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let res = await media.mintForCreator(creator, 1233,
                {
                    "tokenURI":"http://api-test.pxbee.com/test/a/c/money?id=abcdedffafd",
                    "contentHash":"0xC276C1A473409D1D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C"
                });
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(1233);
            await expect(c == creator);
        }).timeout(30000);

        it("transfer from not owner", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media.transferFrom(creator, newOwner, 1233);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(1233);
            await expect(c == newOwner);
        }).timeout(30000);

        it("transfer from owner", async ()=>{
            const media = await operateMediaAs(actor0Wallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media.transferFrom(creator, newOwner, 1233);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.ownerOf(1233);
            await expect(c == newOwner);
        }).timeout(30000);

        it("duplicate tokenID mint", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let res = await media.mint(123,
                {
                    "tokenURI":"http://api-test.pxbee.com/test/a/c/money?id=abcdedffafd",
                    "contentHash":"0xdd7661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C"
                });
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);

        it("duplicate content hash mint", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let res = await media.mint(333,
                {
                    "tokenURI":"http://api-test.pxbee.com/test/a/c/money?id=abcdedffafd",
                    "contentHash":"0xC27661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C"
                });
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);

        it("finalization", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let res = await media.finalize();
            await expect(res.wait()).eventually.fulfilled;

            let supply = await media.totalSupply();
            console.log(`Supply: ${supply}`);
        }).timeout(30000);

        it("mint after finalization", async ()=>{
            const media = await operateMediaAs(deployerWallet);
            let res = await media.mint(321,
                {
                    "tokenURI":"http://api-test.pxbee.com/test/a/c/money?id=321",
                    "contentHash":"0x127661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C"
                });
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);
    })
});