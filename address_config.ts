
function getContractAddressBookByType(type) {
	if(type == "pixie")
		return "pixie";
    else if(type == "pixie_test")
		return "pixie_test";
    else if(type == "hard")
        return "hard";
    else
        return "hard";
}

export function getAddressBookShareFilePath() {
    return `${process.cwd()}/addresses/${getContractAddressBookByType("hard")}.json`;
}
