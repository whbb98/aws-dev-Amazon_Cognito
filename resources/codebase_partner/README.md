# Coffee suppliers sample app

## Summary
This is a simple CRUD app built with Express.


## Running locally

### 1. Build the local Db
```sql
create DATABASE coffee;
use coffee;
create table suppliers(
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100) NOT NULL,
  PRIMARY KEY ( id )
);
create table beans(
  id INT NOT NULL AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  type VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY ( id )
);
```

### 2. Install and run the server
```zsh
npm install

# define your db vars at start
MEMC_HOST=localhost \
APP_DB_HOST=localhost \
APP_DB_USER=root \
APP_DB_PASSWORD="" \
APP_DB_NAME=coffee \
npm start
```
If you do not set the env vars when starting the app the values 
from `app/config/config.js` will be used

## SQS Notes

If env var `SQS_ENDPOINT` is present when the app starts, it will begin polling that SQS endpoint

If processing of a SQS item fails (malformed message, Db connect failure, ...), it will not delete the SQS item 
(allowing VisibilityTimeout to expire) and return to polling the SQS queue.

Polling will continue to attempt to process malformed SQS items, at a rate of the VisibilityTimeout returning the 
item to the queue.  There is an expectation the targeted SQS queue will have a Dead-letter queue configured, so 
we don't endlessly try to process malformed items.