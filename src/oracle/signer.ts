import { ethers } from "ethers";

const privateKey = process.env.ORACLE_PRIVATE_KEY;
if (!privateKey) throw new Error("Missing ORACLE_PRIVATE_KEY");

const wallet = new ethers.Wallet(privateKey);

/**
 * Hash the prediction like Solidity:
 * keccak256(abi.encodePacked(id, prediction, confidence))
 */
function hashPrediction(id: number, prediction: number, confidence: number) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "uint256"],
    [id, prediction, confidence],
  );

  return ethers.keccak256(encoded);
}

export async function signPrediction({
  id,
  prediction,
  confidence,
}: {
  id: number;
  prediction: number;
  confidence: number;
}) {
  const messageHash = hashPrediction(id, prediction, confidence);

  // match contract's getEthSignedMessageHash()
  const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(messageHash));

  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return {
    id,
    prediction,
    confidence,
    signature,
    signer: wallet.address,
    messageHash,
    ethSignedMessageHash,
  };
}
