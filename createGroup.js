import dotenv from "dotenv";
import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import { ethers } from "ethers";
import fs from "fs";
dotenv.config();

// interface GroupRules {
//   entry?: { conditions?: any[] };
//   chat?: { conditions?: any[] };
// }

// interface GroupOptions {
//   description?: string;
//   image?: string; // base 64 encoded string
//   members?: string[];
//   admins?: string[];
//   private?: boolean;
//   rules?: GroupRules;
// }

// interface CreateGroupParams {
//   name: string;
//   options?: GroupOptions;
// }

// const createdGroup = async ({ name, options }: CreateGroupParams): Promise<any> => {
//   // Your implementation here
// };

const signer = new ethers.Wallet(process.env.PUSH_PRIVATE_KEY);

// Example
const groupName = "Omni Push Group";
const groupDescription = "This is an example group.";
// const groupImage = "data:image/png;base64,iVBORw0K..."; // example base64 encoded image string
// const walletAdmin = process.env.PUSH_PUBLIC_KEY;
// const walletAddress2 = "0x456...";
// const walletAddress3 = "0x789...";
// Initialize wallet user
// PushAPI.initialize(signer, {options?});
// 'CONSTANTS.ENV.PROD' -> mainnet apps | 'CONSTANTS.ENV.STAGING' -> testnet apps
const userAlice = await PushAPI.initialize(signer, {
  env: CONSTANTS.ENV.PROD,
});

// Check for errors in userAlice's initialization and handle them if any
if (userAlice.errors.length > 0) {
  // Handle Errors Here
  throw new Error(userAlice.errors);
}

const groupImage = fs.readFileSync("./pushImage.txt", "base64");

const newGroup = await userAlice.chat.group.create(groupName, {
  description: groupDescription,
  image: groupImage,
  // members: [walletAdmin],
  // members: [walletAddress1, walletAddress2, walletAddress3],
  // admins: [walletAdmin],
  private: false,
  // rules: {
  //   entry: { conditions: [] },
  //   chat: { conditions: [] },
  // },
});

console.log(newGroup);
