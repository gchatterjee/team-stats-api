# Team Stats Load Task

## Setup

To develop on this project, you need the following installed.

- nodejs (currently using v24)
- AWS CLI and AWS SAM
  - you will need to run `aws configure` in order to use the deployment commands

## Deploy

```sh
# install dependencies
npm install

# build the project
npm run build

# prepare to deploy
sam build

# validate (this step is not necessary if you didn't modify `template.yaml`)
sam validate

# deploy
sam deploy
```
