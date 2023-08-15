#!/usr/bin/python
import sys
import time
import boto3

regional_acl_arn = sys.argv[1]
apigateway_id = sys.argv[2]
stage = sys.argv[3]

#apigateway_client = boto3.client('apigateway')
waf_client = boto3.client('wafv2')

resource_arn = 'arn:aws:apigateway:us-east-1::/restapis/'+apigateway_id+'/stages/'+stage
association_succeeded = False

while association_succeeded is False:
    try: 
        api_association = waf_client.associate_web_acl(WebACLArn=regional_acl_arn, ResourceArn=resource_arn)
        association_succeeded = True
    except:
        print('Waiting for API Gateway stage to deploy. This can take a few minutes. Sleeping for 30 seconds')
        time.sleep(30)
else:
    print('WAF ACL association with API Gateway succeeded')
