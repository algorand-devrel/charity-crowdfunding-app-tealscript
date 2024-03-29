# charity-crowdfunding-tealscript

This is a fullstack charity crowdfunding application built with AlgoKit, the fullstack template, and TEALScript for the smart contract. See below for getting started instructions.

## Understanding the project structure
This project has 2 folders: Backend and Frontend

### Backend Folder
Backend folder is where you write your smart contract, tests, and deploy your contract. `backend/smart_contracts/charity_crowdfunding/contract.algo.ts` is the charity crowdfunding smart contract written in TEALScript that has the following features
- bootstrap: insert charity information and create reward NFT
- fund: external method used by donators to donate to the charity
- claimfund: method used by the creator to claim collected funds
- deleteDonatorInfo: delete boxes containing donator info

### Frontend Folder
Frontend holds a full React frotend for the chairty application. Currently you can:
- Create a charity
- fund the charity and receive a reward NFT

TODO
- create an admin page to claim collected funds

## Setup

### Initial setup

1. Clone this repository locally.
2. Install pre-requisites:
   - Make sure to have [Docker](https://www.docker.com/) installed and running on your machine.
   - Install `AlgoKit` - [Link](https://github.com/algorandfoundation/algokit-cli#install): The minimum required version is `1.3.0`. Ensure you can execute `algokit --version` and get `1.3.0` or later.
   - Bootstrap your local environment; run `algokit bootstrap all` within this folder, which will install Poetry, run `npm install` and `poetry install` in the root directory to install NPM and Python packages respectively, set up a `.venv` folder with a Python virtual environment and also install all Python dependencies.
     - For TypeScript projects, it will also run `npm install` to install NPM packages.
     - For all projects, it will copy `.env.template` to `.env`.
   - Run `algokit localnet start` to start a local Algorand network in Docker. If you are using VS Code launch configurations provided by the template, this will be done automatically for you.
3. Open the project and start debugging / developing on:
   - [Backend](backend/README.md) - Refer to the README for more information on how to work with smart contracts.
   - [Frontend](frontend/README.md) - Refer to the README for more information on how to work with the frontend application.

# Demo

Make sure you are in workspace mode for vscode. You can do this by going to the `charity-crowdfunding-tealscript.code-workspace` file and clicking on the `workspace` button on the bottom right of the screen. This will open up the workspace in vscode.

Before you continue make sure you have Docker Desktop running in the background. We use Docker to launch a local Algorand blockchain on your computer.

## Backend
Make sure you are in the `Backend` folder in your terminal.

The `deploy-config.ts` file in `backend/smart_contracts/charity_crowdfunding` folder contains a test script that goes through the entire lifecycle of a charity crowdfunding app. You can run this script by running the following command in the terminal:

```
cd smart_contracts/charity_crowdfunding
npx tealscript contract.algo.ts ../artifacts/charity_crowdfunding_app
algokit generate client ../artifacts/charity_crowdfunding_app -o ../artifacts/charity_crowdfunding_app/client.ts -l typescript 
```

Then go to "RUN AND DEBUG" in VSCode and Run `Deploy Built TEALScript application`


## Frontend
Make sure you are in the `frontend` folder in your terminal.

To launch a local server to play around with the frontend:

```
npm run build
npm run preview
```

Running these two commands will launch a local server with the frontend running on it. 


### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit bootstrap all` again.
2. Follow step 3 above.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:
  - The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
  - The frontend application is deployed to a provider of your choice (Netflify, Vercel, etc.). See [frontend README](frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

This project makes use of Python and React to build Algorand smart contracts and to provide a base project configuration to develop frontends for your Algorand dApps and interactions with smart contracts. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Python dependencies including Poetry, Black, Ruff or Flake8, mypy, pytest, and pip-audit
- React and related dependencies including AlgoKit Utils, Tailwind CSS, daisyUI, use-wallet, npm, jest, playwright, Prettier, ESLint, and Github Actions workflows for build validation

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [backend .vscode](./backend/.vscode) and [frontend .vscode](./frontend/.vscode) folders for more details.

## Integrating with smart contracts and application clients

Refer to the [backend](backend/README.md) folder for overview of working with smart contracts, [frontend](frontend/README.md) for overview of the React project and the [frontend/contracts](frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of interactions with your CharityCrowdfundingClient in [`AppCalls.tsx`](frontend/src/components/AppCalls.tsx) component by default.

## Next Steps

You can take this project and customize it to build your own decentralized applications on Algorand. Make sure to understand how to use AlgoKit and how to write smart contracts for Algorand before you start.
