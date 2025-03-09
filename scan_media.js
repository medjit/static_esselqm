/*
    This script scans all MP3 files in the 'media_files/audio' folder and extracts metadata from them.
    The metadata is saved in a JSON file 'temporary_files/scannedData.json'.
    The script also extracts the thumbnail image from the MP3 files and saves them in the 'temporary_files/thumbnails' folder.
    Thankfully to extracted json file, we do not need dynamic backend for the side.
    That is important for the project to be able to run the site on very low spec server like raspberry pi zero or pico and also microcontrollers like esp32 for ofline use and share content.
*/

const path = require("path");
const os = require("os");
const fs = require("fs");
const id3 = require('node-id3');
const mp3Duration = require('mp3-duration');

const dataFilePath = path.join(__dirname, 'esselqm_static_content', 'temporary_files', 'scannedData.json');
const audioFilesFolderPath = path.join(__dirname, 'esselqm_static_content', 'media_files', 'audio');
const thumbnailFolderPath = path.join(__dirname, 'esselqm_static_content', 'temporary_files', 'thumbnails');

function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        mp3Duration(filePath, (err, duration) => {
            if (err) {
                return reject(err);
            }

            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            resolve(durationString);
        });
    });
}

function getMp3Data(filePath) {
    return new Promise((resolve, reject) => {
        id3.read(filePath, async (err, tags) => {
            if (err) {
                return reject(err);
            }

            try {
                const durationString = await getDuration(filePath);

                const mp3Data = {
                    album: tags.album || null,
                    artist: tags.artist || null,
                    comment: tags.comment || null,
                    partOfSet: tags.partOfSet || null,
                    genre: tags.genre || null,
                    title: tags.title || null,
                    trackNumber: tags.trackNumber || null,
                    year: tags.year || null,
                    image: tags.image ? `/esselqm_static_content/metadata/thumbnails/thumbnail_${tags.partOfSet}.jpg` : null,
                    duration: durationString
                };

                if (tags.image) {
                    const thumbnailFilePath = path.join(thumbnailFolderPath, `thumbnail_${tags.partOfSet}.jpg`);

                    //await fs.promises.mkdir(thumbnailFolderPath, { recursive: true });
                    await fs.promises.writeFile(thumbnailFilePath, tags.image.imageBuffer);
                }

                resolve(mp3Data);
            } catch (durationErr) {
                reject(durationErr);
            }
        });
    });
}

let scannedData = [];
let count = 0;

async function scanAllFiles() {
    try {
        const files = await fs.promises.readdir(audioFilesFolderPath);
        for (const file of files) {
            const filePath = path.join(audioFilesFolderPath, file);
            if (path.extname(file) === '.mp3') {
                try {
                    const mp3Data = await getMp3Data(filePath);
                    scannedData.push({
                        name: file,
                        path: path.relative(__dirname, filePath),
                        data: mp3Data
                    });
                    count++;
                    console.log(count + " - Scanned: " + file);
                } catch (err) {
                    console.error(`Error scanning file ${file}:`, err);
                }
            }
        }
        console.log(`Finished scanning ${scannedData.length} MP3 files.`);
    } catch (err) {
        console.error("Error reading directory:", err);
    }
}

async function scanAndStoreData() {
    try {
        const files = await fs.promises.readdir(thumbnailFolderPath);
        for (const file of files) {
            const filePath = path.join(thumbnailFolderPath, file);
            await fs.promises.unlink(filePath);
        }
        console.log("All thumbnails deleted.");
    } catch (err) {
        console.error("Error deleting thumbnails:", err);
    }

    try {
        await fs.promises.unlink(dataFilePath);
        console.log("Existing data file deleted.");
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error("Error deleting data file:", err);
        }
    }

    await scanAllFiles();
    
    try {
        await fs.promises.writeFile(dataFilePath, JSON.stringify(scannedData, null, 2));
        console.log(`Scanned data saved to ${dataFilePath}`);
    } catch (err) {
        console.error("Error writing scanned data to file:", err);
    }
}

scanAndStoreData();