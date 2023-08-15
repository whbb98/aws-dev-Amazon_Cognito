import boto3
import sys

sns_topic = 'arn:aws:sns:us-east-1:<FMI_1>:updated_beans_sns.fifo'
sns_client = boto3.client('sns')
file_name = sys.argv[1]
file_handle = open(file_name)

for message_data in file_handle:
    message_values = message_data.strip().split(':')
    quantity = int(message_values[2])
    if quantity > 0:
        response = sns_client.publish(
            TopicArn=sns_topic,
            Message=message_data.strip(),
            Subject='New bean delivery',
            MessageGroupId='bean_message_group'
        )
    
        print(response)
    else:
        response = sns_client.publish(
            TopicArn=sns_topic,
            Message=message_data.strip(),
            Subject='New bean delivery',
            MessageAttributes={
                'inventory_alert': {
                    'DataType': 'String',
                    'StringValue': 'out_of_stock'
                }
            },
            MessageGroupId='bean_message_group'
        )
        
        print(response)