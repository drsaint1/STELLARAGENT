import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";
import axios from "axios";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const USDC_ISSUER = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export function createWallet() {
  const pair = Keypair.random();
  return {
    publicKey: pair.publicKey(),
    secretKey: pair.secret(),
  };
}

export async function fundWallet(publicKey) {
  const resp = await axios.get(FRIENDBOT_URL, {
    params: { addr: publicKey },
  });
  return resp.data;
}

export async function setupUsdcTrustline(secretKey) {
  const server = new Horizon.Server(HORIZON_URL);
  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();
  const account = await server.loadAccount(publicKey);

  const usdcAsset = new Asset("USDC", USDC_ISSUER);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: usdcAsset,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return {
    hash: result.hash,
    ledger: result.ledger,
  };
}

export async function buildUnsignedPayment(senderPublic, receiverPublic, amount, memo) {
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(senderPublic);

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: receiverPublic,
        asset: Asset.native(),
        amount: String(amount),
      })
    )
    .setTimeout(30);

  if (memo) {
    txBuilder.addMemo(Memo.text(memo.substring(0, 28)));
  }

  const tx = txBuilder.build();
  return tx.toXDR();
}

export async function submitSignedTransaction(signedXdr) {
  const server = new Horizon.Server(HORIZON_URL);
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(tx);
  return {
    hash: result.hash,
    ledger: result.ledger,
  };
}

export async function getBalance(publicKey) {
  const server = new Horizon.Server(HORIZON_URL);
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch {
    return "0";
  }
}

export { HORIZON_URL, USDC_ISSUER };
