import boto3
import json

S3API = boto3.client("s3", region_name="us-east-1") 
bucket_name = "c88348a1901547l4581083t1w754867036746-s3bucket-e5g2hb8j79xu"

policy_file = open("/home/ec2-user/environment/resources/public_policy.json", "r")


S3API.put_bucket_policy(
    Bucket = bucket_name,
    Policy = policy_file.read()
)
print ("Setting Permissions - DONE")