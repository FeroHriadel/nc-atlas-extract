# DEV DOCS
How to get the app running on localhost


## PREREQUISITES
What needs to be filled in before starting



### INFRA

```.env
AWS_ACCOUNT_ID=47...
AWS_REGION=eu-central-1
ENVIRONEMNT=dev
ANTHROPIC_API_KEY=sk-ant-... // Claude API key for data extraction
QUEUE_NAME=nc-atlas-extract-queue // Extraction queue name
OPENAI_API_KEY=sk-proj-h6... // OpenAI key for images generation (not necessary if you don't want to generate images)
```

- run: `cdk deploy`



### SERVER
```apsetting.Development.json
  "S3": {
    "BucketName": "dev-nc-atlas-extract-sources"
  },
  "DynamoDB": {
    "SourcesTableName": "dev-nc-atlas-extract-sources",
    "ExtractionsTableName": "dev-nc-atlas-extract-extractions",
    "EnrichmentsTableName": "dev-nc-atlas-extract-enrichments"
  },
  "Cognito": {
    "UserPoolId": "eu-central-1_I...",
    "UserPoolClientId": "4o...",
    "UserPoolRegion": "eu-central-1"
  },
  "SQS": {
    "QueueUrl": "https://sqs.eu-central-1.amazonaws.com/472693607173/dev-nc-atlas-extract-queue",
    "EnrichmentQueueUrl": "https://sqs.eu-central-1.amazonaws.com/472693607173/dev-nc-atlas-extract-enrichment-queue"
  },
  "Anthropic": {
    "ApiKey": ""
  }
```

- run `dotnet run`



### CLIENT
```src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  cognito: {
    userPoolId: 'eu-central-1...',
    clientId:   '4o...',
    region:     'eu-central-1',
  }
};
```

- run `ng serve`
- user(s) must be manually created in AWS Console/Cognito



## FLOW
- All api calls require cognito bearer token in headers

#### Upload Source
http://localhost:4200/sources/upload
- only pdf supported for now (as of Jun 2026)
- required form fields: Friendly Name & File (Type defaults to 'pdf')
- Upload Source multipart uploads pdf to s3/sources (gets upload parts from Server) and pings the Server upon complition which saves the it in dynamoDB/SourcesTable

#### Sources
http://localhost:4200/sources
- the table shows uploaded sources. Info about uploaded sourfces comes from dynamoDB/SourcesTable.
- change/delete source (pdf/...) details in the Actions column by clicking Update or Delete

#### Init Extraction
http://localhost:4200/extract-data
- click Extract Data in a target source (pdf/...) card


#### Extract Data from Source (pdf/...)
http://localhost:4200/extract-data/sourceId
Has multiple sections:
* Document Preview: shows Source (pdf/...) in browser for convenience
* Extract Sample Pages: gets text from given page-range so user can see how AI will see the document. Can be skipped.
* Describe Text Structure: the form fields will help AI extract data accurately and in the desired format. Get Sample Extraction sends sample text to Server which returns JSON-format data so user sees what they get and may adjust their description as needed. Save Description saves the form fields in LS so user doesn't have to fill out the same thing if they extract the source in stages (recommended).
* Start Extraction: extracts data and saves it in s3 as JSON(s) for each page-range. Flow:
  - Server gets the sourceId and page ranges and data from DescribeTextStructure form from Client. 
  - Uses the data to extract page-ranges text and enqueue each page range in SQS
  - SQS sends page-range text Lambda and it sends it to Claude which returns a JSON with {title, description, category, tags} or {error}. Lambda saves the JSON in S3/extractions and metadata to dynamoDB/ExtractionsTable

#### Extraction Progress
http://localhost:4200/extraction/extractionId
- navigated to automatically after Start Extraction submits
- polls `GET /api/extraction/{id}` every 5 seconds and shows a table of batches with: Start Page, End Page, Status, Error Message, S3 Result Key
- stops polling when extraction status is 'completed' or 'failed'

#### Extractions List
http://localhost:4200/extractions
- shows a table with all extractions (gets data from Server and that from DynamoDB/ExtractionsTable)
- Details button in the Actions column navigates to:

#### Extraction Details
http://localhost:4200/extraction-details/extractionId
- shows Extraction metadata in Extraction Data section (from Server from DynamoDb/ExtractionsTable)
- shows table with: Pages, S3 Key, Title, Description, Category, Tags for each extracted item (from Server from s3 via presigned url)
User can download all extracted items as a single JSON file via the Download JSON button at the bottom of the results table

#### Data Enrichment - List
http://localhost:4200/data-prep
- Shows list of successful extractions each with an Enrich button (and info if already extracted)
- clicking the Enrich btn navigates to:

#### Data Enrichment - Trigger
http://localhost:4200/data-prep/extractionId
- Shows form with Add GPS coords and Generate Images checkboxes. On submit the data enrichment process is triggered.
- A running Enrichment can not be re-triggered. A completed Enrichment can be triggered again.
- On submiting the form the extraction data is shown in cards with an indicator of: pending | processing | failed | completed
- Completed item card shows GPS and Image
- Failed item card shows (hopefully) error with reason
- User can download completed enriched items as a JSON file via the Download JSON button in the Enriched Items section header

Flow:
* Client sends `{ gpsEnabled, imagesEnabled, country }` to `POST /api/extraction/{id}/enrich`
* Server validates: at least one of gpsEnabled/imagesEnabled must be true; country required when gpsEnabled
* Server checks dynamoDB/EnrichmentsTable — returns 409 if enrichment is already "processing"
* Server fetches the extraction from dynamoDB/ExtractionsTable, then downloads all batch result JSONs from S3/extractions and flattens all items across batches
* Server creates an Enrichment record in dynamoDB/EnrichmentsTable with overall status "processing" and each item status "pending", then enqueues one SQS message per item into the enrichment queue. S3 base key per item: `enrichments/{date}-{extraction-slug}/{item-title-slug}`
* Server returns the enrichment record to Client; Client immediately starts polling `GET /api/extraction/{id}/enrichment-status` and renders item cards
* Lambda (enrichmentWorker) processes each SQS message independently:
  - Marks the item "processing" in dynamoDB/EnrichmentsTable
  - If gpsEnabled: queries photon.komoot.io geocoding API (`?q={title} {country}`) and extracts country, state, county, coordinates [lat, lon]
  - If imagesEnabled: calls OpenAI `gpt-image-1` to generate a 1024×1024 image (retries up to 5× on rate-limit), resizes to 350×350 thumbnail via Jimp, uploads both to S3 at `{s3BaseKey}/1024.png` and `{s3BaseKey}/350.png`
  - Saves `{s3BaseKey}/item.json` to S3 containing `{ title, description, category, tags, location, image1024, image350 }`
  - Marks item "completed" (with s3Folder) or "failed" (with errorMessage) in dynamoDB
  - Once all items are settled (completedItems + failedItems >= totalItems), sets enrichment overall status to "completed" in dynamoDB
* Client can fetch final results via `GET /api/extraction/{id}/enriched-items`: Server reads each item's `item.json` from S3 and returns enriched data with presigned URLs for the 350px and 1024px images




