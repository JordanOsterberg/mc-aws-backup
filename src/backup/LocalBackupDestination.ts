import { BackupDestination } from "./BackupDestination";
import fs from 'fs'

export class LocalBackupDestination implements BackupDestination {
    private destinationPath: string;

    name: string = "Local";

    constructor(destinationPath: string) {
        this.destinationPath = destinationPath;
    }

    async backup(filePath: string): Promise<string> {
        let split = filePath.split("/");
        const fileName = split[split.length - 1];

        fs.copyFileSync(filePath, this.destinationPath + fileName);
        return this.destinationPath + fileName;
    }
}