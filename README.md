# line-aws-lambda
AWS Lambda sample for LINE messaging api

## Deploy

Deploy lambda functions:
```
apex deploy --env-file env.json
```

You have to set up API gateway -> Lambda integration with request passthrough.
And set the api url to the webhook setting on LINE Developer console.
