# Backup System Process
1. Select the target server folder
2. Create a new folder inside named "backup_unixtimestamp"
3. Copy `world`, `world_nether`, and `world_the_end` into that backup folder
4. Zip the folder
5. Upload that ZIP to AWS ss3
6. Delete the backup folder