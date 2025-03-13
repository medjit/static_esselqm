/*
    This script scans all MP3 files in the 'media_files/audio' folder and extracts metadata from them.
    The metadata is saved in a JSON file 'temporary_files/scannedData.json'.
    The script also extracts the thumbnail image from the MP3 files and saves them in the 'temporary_files/thumbnails' folder.
    Thankfully, due to the extracted JSON file, we do not need a dynamic backend for the site.
    This is important for the project to run on low-spec servers (e.g., Raspberry Pi Zero or Pico) and microcontrollers (e.g., ESP32) for offline use and content sharing.
*/

// Importing required modules
const path = require("path");  // Used for working with file and directory paths
const os = require("os");      // Provides operating system-related utility methods (not used directly in your code)
const fs = require("fs");      // File system module to interact with files and directories
const id3 = require('node-id3');  // Library for reading ID3 metadata from MP3 files
const mp3Duration = require('mp3-duration'); // Module to get the duration of MP3 files
const cyrillicToLatin = require('cyrillic-to-latin');  // Converts Cyrillic characters to Latin alphabet

// Define paths for the audio files and where to save metadata and thumbnails
const dataFilePath = path.join(__dirname, 'esselqm', 'generated', 'main_data.js'); // Path to store the main data JSON
const audioFilesFolderPath = path.join(__dirname, 'esselqm', 'media', 'audio');     // Path to the folder containing MP3 files
const thumbnailFolderPath = path.join(__dirname, 'esselqm', 'generated', 'thumbnails'); // Path to store thumbnail images

// Function to get the duration of an MP3 file in 'minutes:seconds' format
function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        mp3Duration(filePath, (err, duration) => { // Extract MP3 duration
            if (err) {
                return reject(err);  // If error occurs, reject the promise
            }

            // Format the duration into minutes:seconds format
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            resolve(durationString);  // Resolve with the formatted duration
        });
    });
}

// Function to extract metadata from an MP3 file
function getMp3Data(filePath) {
    return new Promise((resolve, reject) => {
        id3.read(filePath, async (err, tags) => { // Read the ID3 tags from the MP3 file
            if (err) {
                return reject(err);  // If error occurs, reject the promise
            }

            try {
                // Extract the duration of the MP3 file
                const durationString = await getDuration(filePath);

                // Create an object to store the metadata
                const mp3Data = {
                    album: tags.album || null,           // Album name, or null if not available
                    artist: tags.artist || null,         // Artist name, or null if not available
                    comment: tags.comment || null,       // Comment in the tags, or null if not available
                    partOfSet: tags.partOfSet || null,   // Part of set (optional field)
                    genre: tags.genre || null,           // Genre of the music, or null if not available
                    title: tags.title || null,           // Title of the song, or null if not available
                    trackNumber: tags.trackNumber || null, // Track number in the album, or null if not available
                    year: tags.year || null,             // Year the song was released, or null if not available
                    image: tags.image ? path.relative(__dirname, path.join(thumbnailFolderPath.replace('esselqm/', ''), `${tags.partOfSet}.jpg`)) : null, // Thumbnail image file path, or null if not available
                    duration: durationString             // Duration of the MP3 file
                };

                // If a thumbnail image exists in the MP3 metadata, save it to the thumbnail folder
                if (tags.image) {
                    const thumbnailFilePath = path.join(thumbnailFolderPath, `${tags.partOfSet}.jpg`);
                    await fs.promises.writeFile(thumbnailFilePath, tags.image.imageBuffer); // Write the image to a file
                }

                resolve(mp3Data);  // Resolve with the extracted metadata
            } catch (durationErr) {
                reject(durationErr);  // Reject if there's an error getting the duration
            }
        });
    });
}

// Function to convert Cyrillic characters to Latin characters (useful for file/folder naming)
function convertCyrillicToLatin(cyrillicString) {
    // Define a mapping of Cyrillic characters to Latin
    const cyrillicToLatinMap = {
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ы': 'Y', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    // Convert each character from Cyrillic to Latin based on the map
    return cyrillicString.split('').map(char => cyrillicToLatinMap[char] || char).join('');
}

let scannedData = [];  // Array to store the scanned metadata for each artist
let count = 0;         // Counter to track the number of scanned files
let artistFilesInfo = []; // Not used in your code, might be leftover from previous code

// Function to scan all MP3 files in the audio directory and extract metadata
async function scanAllFiles() {
    try {
        // Read the list of files in the audio folder
        const files = await fs.promises.readdir(audioFilesFolderPath);
        for (const file of files) {
            const filePath = path.join(audioFilesFolderPath, file);
            if (path.extname(file) === '.mp3') {  // Check if the file is an MP3
                try {
                    // Get metadata for the MP3 file
                    const mp3Data = await getMp3Data(filePath);
                    const artist = mp3Data.artist || 'Unknown Artist'; // Use 'Unknown Artist' if no artist is provided
                    const artistFolder = convertCyrillicToLatin(artist).replace(/\s+/g, '_');  // Convert artist name to Latin and replace spaces with underscores

                    // Group data by artist
                    let artistData = scannedData.find(data => data.artist === artistFolder);
                    if (!artistData) {
                        artistData = { artist: artistFolder, files: [] };  // If artist data doesn't exist, create a new entry
                        scannedData.push(artistData);  // Add to the scannedData array
                    }

                    // Push MP3 file data into the artist's data
                    artistData.files.push({
                        name: file,                    // File name
                        path: path.relative(__dirname, filePath.replace('esselqm/', '')),  // Relative file path
                        data: mp3Data                  // Metadata for the MP3 file
                    });

                    count++;  // Increment the count of scanned files
                    console.log(count + " - Scanned: " + file);  // Log the file being scanned
                } catch (err) {
                    console.error(`Error scanning file ${file}:`, err);  // Handle error in scanning the MP3 file
                }
            }
        }
        console.log(`Finished scanning ${scannedData.length} artists.`);  // Log when scanning is finished
    } catch (err) {
        console.error("Error reading directory:", err);  // Handle error in reading the directory
    }
}

// Function to scan and store the metadata and thumbnails
async function scanAndStoreData() {
    // Clean up existing files before scanning
    try {
        const files = await fs.promises.readdir(thumbnailFolderPath);
        for (const file of files) {
            const filePath = path.join(thumbnailFolderPath, file);
            await fs.promises.unlink(filePath);  // Delete all existing thumbnail files
        }
        console.log("All thumbnails deleted.");
    } catch (err) {
        console.error("Error deleting thumbnails:", err);  // Handle error in deleting thumbnails
    }

    // Delete all JSON files in the data directory before starting fresh
    try {
        const dataDir = path.dirname(dataFilePath);
        const files = await fs.promises.readdir(dataDir);
        for (const file of files) {
            if (path.extname(file) === '.js') {  // Check if the file is a JSON file
                const filePath = path.join(dataDir, file);
                await fs.promises.unlink(filePath);  // Delete the JSON file
            }
        }
        console.log("All JS files in the data directory deleted.");
    } catch (err) {
        console.error("Error deleting JS files in the data directory:", err);  // Handle error in deleting JSON files
    }

    // Start scanning MP3 files and collecting metadata
    await scanAllFiles();

    // Create the main data object to store all the artist data
    const mainData = {
        generated_at: new Date().toISOString(),  // Timestamp of when the data was generated
        total_artists: scannedData.length,       // Total number of artists scanned
        artists: []                             // Array to store artist-specific data
    };

    // Loop through each artist and create individual JSON files
    for (const artistData of scannedData) {
        const artistJsonFileName = `${artistData.artist}.js`;  // File name for the artist's JSON
        const artistJsonFilePath = path.join('esselqm', 'generated', artistJsonFileName);  // Path to save artist's JSON
        const artistFileSize = Buffer.byteLength(JSON.stringify(artistData), 'utf8');  // Get the size of the artist JSON file
        const artistJsonData = {
            generated_at: new Date().toISOString(),  // Timestamp when the artist JSON file was generated
            files: artistData.files,                // List of MP3 files for the artist
            size: artistFileSize                    // Size of the artist's JSON file
        };

        // Generate JavaScript variable with the artist folder name
        const artistFolderName = artistData.artist;  // The folder name should be the artist's name (already converted to Latin)
        const artistJsContent = `var ${artistFolderName}_data = ${JSON.stringify(artistJsonData, null, 2)};`;

        try {
            await fs.promises.writeFile(path.join(__dirname, artistJsonFilePath), artistJsContent);  // Write the JS variable data to the file
            console.log(`Artist data saved to ${artistJsonFilePath}`);
            mainData.artists.push({
                name: artistData.artist,
                path: artistJsonFilePath.replace('esselqm/', ''),  // Remove 'esselqm/' from the path
                size: artistFileSize,
                generated_at: artistJsonData.generated_at
            });
        } catch (err) {
            console.error(`Error writing artist data for ${artistData.artist}:`, err);  // Handle error in writing artist data
        }
    }

    // Write the main data JSON file containing all artist metadata
    try {
        await fs.promises.writeFile(dataFilePath, `var main_data = ${JSON.stringify(mainData, null, 2)};`);  // Write the main data to a JS variable
        console.log(`Main data saved to ${dataFilePath}`);
    } catch (err) {
        console.error("Error writing main data to file:", err);  // Handle error in writing the main data
    }
}

// Start the process of scanning and storing data
scanAndStoreData();
