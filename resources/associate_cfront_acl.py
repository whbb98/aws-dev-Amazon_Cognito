#!/usr/bin/python
import sys
import boto3

cfront_id = sys.argv[1]
acl_arn = sys.argv[2]

cfront_client = boto3.client('cloudfront')

cfront_config = cfront_client.get_distribution_config(Id=cfront_id)
#updating WebACLId in dictionary
cfront_config['DistributionConfig']['WebACLId']=acl_arn
#print(cfront_config['DistributionConfig'])
#passing the config back to update the web acl
cfront_update_dist = cfront_client.update_distribution(DistributionConfig=cfront_config['DistributionConfig'],Id=cfront_id,IfMatch=cfront_config['ETag'])