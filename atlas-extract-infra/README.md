# ATLAS-EXTRACT-INFRA(structure)



### DEV DEPLOYMENT
- dev is intended only to provide basic infrastructure for locally run BE & FE. That is: DynamoDB tables, S3, SQS and Lambda workers.
- to deploy dev infrastructure add .env with:

```.env
AWS_ACCOUNT_ID=47...
AWS_REGION=eu-central-1
ENVIRONEMNT=dev //MUST BE CALLED "dev" !
ANTHROPIC_API_KEY=sk-ant-...
QUEUE_NAME=nc-atlas-extract-queue
OPENAI_API_KEY=sk-proj-...
```
- then run `cdk deploy`



### PROD
- will deploy BE & FE on EC2 and create all relevant resources. Apart from S3, lambda, sqs, dynamodb also ACM certificate, cloudfront, R53 record, a Secret in Secrets Manager, IAM role for github, Elastic IP... It will also create a deployment pipeline (github actions)

- deployment steps:
* add .env with:
```.env
AWS_ACCOUNT_ID=47...
AWS_REGION=eu-central-1
ENVIRONEMNT=prod
QUEUE_NAME=nc-atlas-extract-queue
// don't add ANTROPHIC & OPENAI keys! => they will be in SecretsMnager !
```
* deploy microservices with: `cdk deploy AtlasExtractInfraStack-prod`. It will print UserPoolId and UserPoolClientId => copy them for step 3
* Put UserPoolId and UserPoolClientId from previous step to environment.prod.ts & appsettings.Production.json, then commit to github
* Deploy Certificate & Deployment Stacks with: `cdk deploy CertificateStack DeploymetStack`.
* DeploymentStack outputs will print AWS_DEPLY_ROLE_ARN, AWS_ARTIFACT_BUCKET, AWS_EC2_INSTANCE_ID. Set them as hithub secrets.
* Go to AWS Secrets Manager: prod-nc-atlas-extract-api-keys / and set ANTHROPIC_API_KEY and OPENAI_API_KEY as json.
* push to master - the pipeline runs and deploys the app for the first time. Github will know to run an action because of the .github/workflows/deploy.yml where we specified build steps.