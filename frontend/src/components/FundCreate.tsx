// // import { Button } from "react-bootstrap";
// // import { algodClient, contract } from "../constants/Constants";
// // import { pera } from "../wallet/pera";
// // import algosdk from "algosdk";
// // import * as algokit from "@algorandfoundation/algokit-utils";
// // import { Crowdfunding_App } from "../crowdfunding_app_client";

// type Status = "start" | "fund" | "create";

// interface StartComponentProps {
//   onStatusChange: (newStatus: Status) => void;
// }

// // let auctionAppId: number;
// // let auctionApp: algokit.ApplicationClient;

// async function signer(txns: algosdk.Transaction[]) {
//   return await pera.signTxns(txns);
// }

// export function FundCreate({ onStatusChange }: StartComponentProps) {
//   const handleClick = async () => {
//     const appClient = new Crowdfunding_App({
//       client: algodClient,
//       signer: signer,
//       sender: pera.accounts[0],
//     });
//     console.log(appClient);
//     const { appId, appAddress, txId } = await appClient.createApplication();
//     console.log(
//       `Created app ${appId} with address ${appAddress} in tx ${txId}`
//     );

//     onStatusChange("create");
//   };

//   return (
//     <Button onClick={handleClick} variant="success">
//       Fund
//     </Button>
//   );
// }
