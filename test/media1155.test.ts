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

describe('Project Media1155',  () => {

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

    async function operateMedia1155As(wallet: Signer){return factory.Media1155__factory.connect(addressBook["Media1155"], wallet);}

    describe("Deploy", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("Deploy New", async ()=>{
            const deployTx = await (await new factory.Media1155__factory(deployerWallet).deploy({ gasLimit: 5000000 })).deployed();
            addressBook["Media1155"] = deployTx.address;
            console.log(addressBook);
            await fs.writeFile(sharedAddressPath, JSON.stringify(addressBook, null, 2));
        }).timeout(30000);
    })

    describe("Media1155", ()=>{
        beforeEach(async ()=>{
            await prepareSigners();
            await getContractAddress();
        })

        it("base uri", async ()=>{
            const media = await operateMedia1155As(deployerWallet);
            let res = await media.setURI("http://testmedia1155/token_{%d}");
            await expect(res.wait()).eventually.fulfilled;
            let uri = await media.uri(123);
            console.log(`Media1155 #123 uri:`);
            console.log(uri);
        }).timeout(30000);

        it("mint for creator", async ()=>{
            const media = await operateMedia1155As(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let res = await media.mintForCreator(creator, 
                1233,
                "0xC276C1A473409D1D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C",
                1000);
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.balanceOf(creator, 1233);
            await expect(c.eq(1000));
            let hash = await media.tokenContentHashes(1233);
            console.log(hash);
            await expect(hash == "0xC276C1A473409D1D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C");
        }).timeout(30000);

        it("transfer from not owner", async ()=>{
            const media = await operateMedia1155As(deployerWallet);
            let creator = await actor0Wallet.getAddress();
            let notOwner = await deployerWallet.getAddress();
            let res = await media.safeTransferFrom(notOwner, creator, 1233, 100, "0x00");
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.balanceOf(notOwner, 1233);
            console.log(c);
        }).timeout(30000);

        it("transfer from owner", async ()=>{
            const media = await operateMedia1155As(actor0Wallet);
            let creator = await actor0Wallet.getAddress();
            let newOwner = await deployerWallet.getAddress();
            let res = await media.safeTransferFrom(creator, newOwner, 1233, 100, "0x00");
            await expect(res.wait()).eventually.fulfilled;
            let c = await media.balanceOf(newOwner, 1233);
            await expect(c.eq(100));
        }).timeout(30000);

        it("duplicate tokenID mint", async ()=>{
            const media = await operateMedia1155As(deployerWallet);
            let newOwner = await deployerWallet.getAddress();
            let res = await media.mintForCreator(newOwner, 1233,
                "0xdd7661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C",
                1000);
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);

        it("duplicate content hash mint", async ()=>{
            const media = await operateMedia1155As(deployerWallet);
            let newOwner = await deployerWallet.getAddress();
            let res = await media.mintForCreator(newOwner, 333,
                "0xC27661A473409D7D5D6804A51C1451184FBD9D564232E3181E17CF7EF39B8C1C",
                1000);
            await expect(res.wait()).eventually.rejected;
        }).timeout(30000);
    })
});