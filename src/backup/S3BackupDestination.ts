import { BackupDestination } from "./BackupDestination";
import fs from 'fs'
import AWS from 'aws-sdk';

export class S3BackupDestination implements BackupDestination {
    private AWS_ACCESS_ID: string;
    private AWS_SECRET: string;
    private bucketName: string;
    private region: string;

    name: string = "AWS S3";

    constructor(
        AWS_ACCESS_ID: string,
        AWS_SECRET: string,
        bucketName: string,
        region: string,
    ) {
        this.AWS_ACCESS_ID = AWS_ACCESS_ID;
        this.AWS_SECRET = AWS_SECRET;
        this.bucketName = bucketName;
        this.region = region;
    }

    async backup(filePath: string): Promise<string> {
        AWS.config.update({
            accessKeyId: this.AWS_ACCESS_ID,
            secretAccessKey: this.AWS_SECRET,
            region: this.region
        });

        const s3 = new AWS.S3();

        const pathSplit = filePath.split("/");
        const fileName = pathSplit[pathSplit.length - 1];

        const body = fs.readFileSync(filePath);

        const params = {
            Bucket: this.bucketName ?? "",
            Key: fileName,
            Body: body,
            ACL: 'public-read'
        };

        return new Promise((resolve, reject) => {
            s3.upload(params, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }

                resolve(data.Location);
            });
        });
    }
}