
function getContractAddressBookByType(type) {
	if(type == "pixie")
		return "pixie";
    else if(type == "pixie_test")
		return "pixie_test";
    else if(type == "polygon_test")
        return "polygon_test";
    else if(type == "hard")
        return "hard";
    else
        return "hard";
}

export function getAddressBookShareFilePath(type) {
    return `${process.cwd()}/addresses/${getContractAddressBookByType(type)}.json`;
}
