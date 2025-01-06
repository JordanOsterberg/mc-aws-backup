export interface BackupDestination {
    name: string;

    backup(filePath: string): Promise<string>;
}