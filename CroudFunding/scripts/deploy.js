const { ethers } = require("hardhat");

async function main() {
  const CroudFunding = await ethers.getContractFactory("CroudFunding");
  
  const token = await CroudFunding.deploy();
  await token.waitForDeployment();
  
  const address = await token.getAddress();
  console.log("CroudFunding deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  //CroudFunding deployed to: 0xB60a78201C7e1468Af145B076319421F362E4476