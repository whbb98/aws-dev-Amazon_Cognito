const AWS = require('aws-sdk');
const cacheTtlInSec = 300;
const memcached = require('../cache/memcache');
// example SQS payload
// {
//     "Type": "Notification",
//     "MessageId": "de85618e-71b6-5670-ae64-38e4e8fd079c",
//     "SequenceNumber": "10000000000000000012",
//     "TopicArn": "arn:aws:sns:us-west-2:559625953091:updated_beans.fifo",
//     "Message": "4:liberica:0",
//     "Timestamp": "2021-07-15T20:14:03.540Z",
//     "UnsubscribeURL": "https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-west-2:559625953091:updated_beans.fifo:31719c7b-e993-49cb-864f-98ab539da17b",
//     "MessageAttributes": {
//     "inventory_alert": {
//         "Type": "String",
//             "Value": "out_of_stock"
//         }
//     }
// }
let config = {
    VISIBILITY_TIMEOUT_IN_SEC: 5,
    LONG_POLL_WAIT_IN_SEC: 5,
}

Object.keys(config).forEach(key => {
    if (process.env[key] === undefined) {
        console.log(`[NOTICE] Value for key '${key}' not found in ENV, using default value.  See app/sqs/consumer.js`)
    } else {
        config[key] = process.env[key]
    }
});

const sqs_url = get_sqs_endpoint()

const sqs_client_params = {
    QueueUrl: sqs_url,
    // Only set up to do one message at a time
    MaxNumberOfMessages: 1,
    VisibilityTimeout: config.VISIBILITY_TIMEOUT_IN_SEC,
    WaitTimeSeconds: config.LONG_POLL_WAIT_IN_SEC
};
module.exports = bean_model => {
    if (sqs_url) {
        const aws_region = parse_region_from_endpoint(sqs_url)
        AWS.config.update({region: aws_region});
        const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
        console.log("Listening to SQS:", sqs_client_params)
        read_message(sqs, bean_model)
    } else {
        console.log("No env var: SQS_ENDPOINT seen.  Not listening to SQS")
    }
}

function read_message(sqs_client, bean_model) {
    console.log("Calling read_message")
    sqs_client.receiveMessage(sqs_client_params, (err, data) => {
        if (err) {
            console.log(err, err.stack);
        } else {
            if (!data || !data.Messages) {
                console.log('Nothing to process');
                read_message(sqs_client, bean_model);
            } else {
                update_db(data, sqs_client, sqs_url)
            }
        }
    })
}

function get_sqs_endpoint() {
    if (process.env["SQS_ENDPOINT"] === undefined) {
        console.log("SQS endpoint not found")
        return false
    }
    return process.env["SQS_ENDPOINT"]
}

function update_db(sqs_data, sqs_client, sqs_url) {
    const bean_attributes = parse_message(sqs_data.Messages[0])
    const receipt_handle = sqs_data.Messages[0].ReceiptHandle
    bean_model.getBeanBySupplierIdType(
        bean_attributes.supplier_id,
        bean_attributes.bean_type,
        (err, bean) => {
            if (err) {
                console.log("Error retrieving bean of type ", bean_attributes.bean_type, "for supplier",
                    bean_attributes.supplier_id, "error:", err)
                read_message(sqs_client, bean_model);
            } else {
                bean.quantity = Number(bean_attributes.quantity) + Number(bean.quantity)
                bean_model.updateById(bean.id, bean, (err, data) => {
                    if (err) {
                        console.log("Error updating bean quantity: ", err)
                        read_message(sqs_client, bean_model);
                    } else {
                        delete_item_from_sqs(sqs_client, sqs_url, receipt_handle)
                        clear_cache(bean)
                        read_message(sqs_client, bean_model);
                    }
                });
            }
        }
    );
}

function parse_region_from_endpoint(endpoint) {
    re = /sqs\.([a-z0-9-]+)/
    match = endpoint.match(re)
    if (typeof match[1] === 'undefined') {
        console.log("Failed parsing aws region from SQS URL: " + endpoint)
    }
    return match[1]
}

function delete_item_from_sqs(sqs_client, sqs_url, receipt_handle){
    const deleteParams = {
        QueueUrl: sqs_url,
        ReceiptHandle: receipt_handle
    };
    sqs_client.deleteMessage(deleteParams, (err, data) => {
        if (err) {
            console.log(err, err.stack);
        } else {
            console.log('Successfully deleted message from queue');
        }
    });
}

function clear_cache(bean) {
    // Write-through logic: add this new record to the cache
    memcached.set('beans_' + bean.id, JSON.stringify(bean), cacheTtlInSec, function (err) {
        if (err) {
            console.error("Unable to clear cache for bean with id:", bean.id, "Error:", err)
        } else {
            console.log("Cleared cache for bean with id:", bean.id)
        }
    });
    // FindAll is now stale
    memcached.del('beans_all', function (err) {
        if (err) {
            console.error("Unable to clear 'beans_all' cache. Error:", err)
        } else {
            console.log("Cleared cache for 'beans_all' result")
        }
    });
}

function parse_message(message_item) {
    message_body = JSON.parse(message_item.Body)
    message = message_body.Message
    console.log("SQS message field: ", message)
    message_segments = message.split(':').map(e => e.trim())
    fields = {supplier_id: message_segments[0], bean_type: message_segments[1], quantity: message_segments[2]}
    console.log("SQS message parsed as: ", fields)
    return fields
}

