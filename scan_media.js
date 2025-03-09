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
const cyrillicToLatin = require('cyrillic-to-latin'); // For converting Cyrillic to Latin alphabet

const dataFilePath = path.join(__dirname, 'esselqm', 'generated', 'main_data.json');
const audioFilesFolderPath = path.join(__dirname, 'esselqm', 'media', 'audio');
const thumbnailFolderPath = path.join(__dirname, 'esselqm', 'generated', 'thumbnails');

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
                    image: tags.image ? path.relative(__dirname, path.join(thumbnailFolderPath, `${tags.partOfSet}.jpg`)) : null,
                    duration: durationString
                };

                if (tags.image) {
                    const thumbnailFilePath = path.join(thumbnailFolderPath, `${tags.partOfSet}.jpg`);

                    await fs.promises.writeFile(thumbnailFilePath, tags.image.imageBuffer);
                }

                resolve(mp3Data);
            } catch (durationErr) {
                reject(durationErr);
            }
        });
    });
}

function convertCyrillicToLatin(cyrillicString) {
    const cyrillicToLatinMap = {
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ы': 'Y', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    return cyrillicString.split('').map(char => cyrillicToLatinMap[char] || char).join('');
}

let scannedData = [];
let count = 0;
let artistFilesInfo = [];

async function scanAllFiles() {
    try {
        const files = await fs.promises.readdir(audioFilesFolderPath);
        for (const file of files) {
            const filePath = path.join(audioFilesFolderPath, file);
            if (path.extname(file) === '.mp3') {
                try {
                    const mp3Data = await getMp3Data(filePath);
                    const artist = mp3Data.artist || 'Unknown Artist';
                    const artistFolder = convertCyrillicToLatin(artist).replace(/\s+/g, '_'); // Convert the artist name to Latin and replace spaces with underscores

                    // Group by artist and store the data
                    let artistData = scannedData.find(data => data.artist === artistFolder);
                    if (!artistData) {
                        artistData = { artist: artistFolder, files: [] };
                        scannedData.push(artistData);
                    }

                    artistData.files.push({
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
        console.log(`Finished scanning ${scannedData.length} artists.`);
    } catch (err) {
        console.error("Error reading directory:", err);
    }
}

async function scanAndStoreData() {
    // Clean up existing files before scanning
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

    // Delete all JSON files in the directory where dataFilePath is located
    try {
        const dataDir = path.dirname(dataFilePath);
        const files = await fs.promises.readdir(dataDir);
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const filePath = path.join(dataDir, file);
                await fs.promises.unlink(filePath);
            }
        }
        console.log("All JSON files in the data directory deleted.");
    } catch (err) {
        console.error("Error deleting JSON files in the data directory:", err);
    }

    // Start scanning audio files
    await scanAllFiles();

    // Now, create individual artist JSON files and the main data JSON file
    const mainData = {
        generated_at: new Date().toISOString(),
        total_artists: scannedData.length,
        artists: []
    };

    for (const artistData of scannedData) {
        const artistJsonFileName = `${artistData.artist}.json`;
        const artistJsonFilePath = path.join('esselqm', 'generated', artistJsonFileName);
        const artistFileSize = Buffer.byteLength(JSON.stringify(artistData), 'utf8');
        const artistJsonData = {
            generated_at: new Date().toISOString(),
            files: artistData.files,
            size: artistFileSize
        };

        try {
            await fs.promises.writeFile(path.join(__dirname, artistJsonFilePath), JSON.stringify(artistJsonData, null, 2));
            console.log(`Artist data saved to ${artistJsonFilePath}`);
            mainData.artists.push({
                name: artistData.artist,
                path: artistJsonFilePath,
                size: artistFileSize,
                generated_at: artistJsonData.generated_at
            });
        } catch (err) {
            console.error(`Error writing artist data for ${artistData.artist}:`, err);
        }
    }

    // Write the main JSON file
    try {
        await fs.promises.writeFile(dataFilePath, JSON.stringify(mainData, null, 2));
        console.log(`Main data saved to ${dataFilePath}`);
    } catch (err) {
        console.error("Error writing main data to file:", err);
    }
}

scanAndStoreData();
