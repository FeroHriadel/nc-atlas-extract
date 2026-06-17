export const environment = {
  production: true,
  apiUrl: 'https://atlas-extract.nclabs.eu/api',
  cognito: {
    userPoolId: 'eu-central-1_8XbmRmslD',   // UserPoolId output from AtlasExtractInfraStack-prod
    clientId:   '10bptr202qs15lthuammlka4c7',   // UserPoolClientId output from AtlasExtractInfraStack-prod
    region:     'eu-central-1',
  }
};
