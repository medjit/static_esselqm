//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                           Show / Hide sidebar                               //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
document.getElementById('hamburger').addEventListener('click', function () {
   const sidebar = document.getElementById('sidebar');
   sidebar.classList.toggle('show');
});


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                       Change Theme: dark / light                            //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
document.getElementById('theme-toggle').addEventListener('click', function () {
   const body = document.body;
   const currentTheme = body.classList.contains('light-theme')
      ? 'light'
      : 'dark';
   const newTheme = currentTheme === 'light' ? 'dark' : 'light';
   body.classList.remove(`${currentTheme}-theme`);
   body.classList.add(`${newTheme}-theme`);
   localStorage.setItem('theme', newTheme);
});


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                      Execute when page is loaded                            //
//                                                                             //
//                       Load content in index page.                           //
//            Set the theme from local storage for every page.                 //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
document.addEventListener('DOMContentLoaded', function () {
   // Check if the current page is the index page
   if (window.location.pathname.endsWith('index.html') ||
       window.location.pathname === '/') {
         // Load the 'data' object
         console.log(main_data);

         // Dynamically create and load the script for Mishari Rashid Al Afasi
         const script = document.createElement('script');
         script.src = main_data.artists[0].path; // Use the artist path from the 'data' object
         script.onload = function() {
            // Once the script is loaded, you can print the content to the console
            console.log('Mishari Rashid Al Afasi data loaded');
            // Print the content here (assuming the content is in the global scope)
            const filename = script.src.split('/').pop().replace('.js', '');
            const artistData = window[`${filename}_data`];
            console.log(artistData); // This would print the `artistData` object
         };
         document.head.appendChild(script); // Append the script to the head of the document
   }

   // Load the theme from local storage
   const savedTheme = localStorage.getItem('theme');
   if (savedTheme) {
      document.body.classList.add(`${savedTheme}-theme`);
   } else {
      document.body.classList.add('light-theme');
   }
});




//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                  Generate HTML box for every mp3 file                       //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
function generateFileBoxes(files) {
   const container = document.getElementById('main-content');
   container.innerHTML = ''; // Clear any existing content

   files.forEach((file) => {
      const cardWrapper = document.createElement('div');
      cardWrapper.classList.add('card-wrapper');

      // Create div for the image
      const imageDiv = document.createElement('div');
      imageDiv.classList.add('image');

      const thumbnail = document.createElement('img');
      if (file.data.image) {
         // Load image from address path stored in file.data.image
         thumbnail.src = file.data.image;
      } else {
         thumbnail.src = 'default-thumbnail.png'; // Fallback image if file.data.image is not available
      }
      thumbnail.alt = `${file.title} thumbnail`;
      imageDiv.appendChild(thumbnail);

      // Append the image div to the card wrapper
      cardWrapper.appendChild(imageDiv);

      // Create div for the card info
      const cardInfo = document.createElement('div');
      cardInfo.classList.add('card-info');

      const title = document.createElement('h3');
      title.textContent = file.data.title;
      cardInfo.appendChild(title);

      const artist = document.createElement('p');
      artist.textContent = file.data.artist;
      cardInfo.appendChild(artist);

      const year = document.createElement('p');
      year.textContent = `Времетраене: ${file.data.duration}`;
      cardInfo.appendChild(year);

      // Create div for actions (e.g., play and download buttons)
      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add('actions');

      // Check if the file is listened or has a time record in localStorage
      const progressKey = `audioProgress_${file.path}`;
      const progressValue = localStorage.getItem(progressKey);

      if (progressValue) {
         const icon = document.createElement('span');
         
         if (progressValue === "listened") {
            // Append the check symbol for "listened"
            icon.textContent = '✔';
            icon.classList.add('check-icon'); // Add class for styling
         } else if (!isNaN(Number(progressValue))) {
            // Append the clock symbol for time record
            icon.textContent = '🕒';
            icon.classList.add('clock-icon'); // Add class for styling
         }
         
         actionsDiv.appendChild(icon);
      }

      // Download button
      const downloadButton = document.createElement('button');
      downloadButton.textContent = '▼ Изтегляне';
      downloadButton.addEventListener('click', () => {
         download_lecture(file.path, file.data.partOfSet, file.data.artist, file.data.title);
      });
      actionsDiv.appendChild(downloadButton);

      // Play button
      const playButton = document.createElement('button');
      playButton.textContent = '▶ Слушай';
      playButton.addEventListener('click', () => {
         // Pass cardInfo (container for the audio) and file.path (audio source) to the function
         createAndPlayAudio(cardInfo, file.path);
      });
      actionsDiv.appendChild(playButton);

      cardInfo.appendChild(actionsDiv);
      cardWrapper.appendChild(cardInfo);
      container.appendChild(cardWrapper);
   });

   // Add button with event listener
   const randomButton = document.createElement('button');
   randomButton.textContent = 'Още';
   randomButton.id = 'load-more-btn';
   randomButton.addEventListener('click', () => {
      getRandomFromLocalMetadata(33);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   });
   container.appendChild(randomButton);
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//           Download mp3 file from filepath and rename it properly            //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
function download_lecture(filepath, id, lectorname, lecturetheme) {
   // Ensure the file path is a valid URL
   if (!filepath) {
       console.error('Filepath is invalid.');
       return;
   }

   const fileName = `${id} ${lectorname} ${lecturetheme}.mp3`;

   // Fetch the file
   fetch(filepath)
       .then(response => {
           // Check if the response is OK
           if (!response.ok) {
               throw new Error('Network response was not ok ' + response.statusText);
           }
           return response.blob();
       })
       .then(blob => {
           // Create a download link for the file
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.style.display = 'none';
           a.href = url;
           a.download = fileName;  // Set the file name for the download

           // Append the anchor element to the body and trigger the download
           document.body.appendChild(a);
           a.click();

           // Clean up by revoking the object URL and removing the anchor
           window.URL.revokeObjectURL(url);
           document.body.removeChild(a);
       })
       .catch(error => console.error('Download error:', error));
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                 Find and remove all audio boxes in page                     //
//                                                                             //
//        Used to stop playing audio if new one is reqested to play            //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
function removeAllRemainingAudioBoxes() {
   const existingAudioboxes = document.querySelectorAll('.audiobox');
   existingAudioboxes.forEach(audiobox => audiobox.remove());
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                Create and play audio in requested lecture                   //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
function createAndPlayAudio(cardInfo, audioSrc) {
   // Check if there's already an audiobox; if so, remove it first
   removeAllRemainingAudioBoxes();

   // Create the audiobox div
   const audiobox = document.createElement('div');
   audiobox.classList.add('audiobox');

   // Create the audio element
   const audioElement = document.createElement('audio');
   audioElement.src = audioSrc;
   audioElement.controls = true;
   audioElement.autoplay = true;

   // Append the audio element to the audiobox
   audiobox.appendChild(audioElement);

   // Append the audiobox to the cardInfo div
   cardInfo.appendChild(audiobox);

   // Play the audio (it's already set to autoplay, but this ensures it's played if needed)
   audioElement.play();
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//  Fetch pregenerated JSON file from server containing list of all lectures   //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
let LectureList = []; // List to store all lectures fetched from the metadata file
async function fetchMetadata() {
   try {
      // Fetch the JSON file containing the lecture metadata
      const response = await fetch(`/generated/main_data.json`);
      
      // If the fetch request fails (non-2xx response), throw an error
      if (!response.ok) {
         throw new Error('Failed to fetch metadata');
      } else {
         console.log('Metadata fetched successfully');
      }

      // Fetch data for each artist and add it to LectureList
      const metadata = await response.json();
      const artistPromises = metadata.artists.map(async (artist) => {
         const artistResponse = await fetch(artist.path);
         if (!artistResponse.ok) {
            throw new Error(`Failed to fetch artist data from ${artist.path}`);
         }
         const artistData = await artistResponse.json();
         LectureList = LectureList.concat(artistData);
      });
      await Promise.all(artistPromises);
      
      // Log the fetched data to the console for debugging purposes
      console.log(LectureList);
   } catch (error) {
      // If any error occurs during the fetch operation, log the error message
      console.error('Error:', error);
   }
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                  Choose random lectures from the list                       //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
async function getRandomFromLocalMetadata(amount = 33) {
   const randomFiles = [];  // Array to hold the randomly selected lectures
   const usedIndices = new Set();  // Set to keep track of indices that have already been used to avoid duplicates

   // Continue selecting random lectures until the desired amount is reached
   // or until all lectures in the list have been used
   while (randomFiles.length < amount && usedIndices.size < LectureList.length) {
      // Generate a random index between 0 and the length of the LectureList array
      const randomIndex = Math.floor(Math.random() * LectureList.length);
      
      // If this index hasn't been used before, add the lecture to the randomFiles array
      // and mark the index as used
      if (!usedIndices.has(randomIndex)) {
         randomFiles.push(LectureList[randomIndex]);
         usedIndices.add(randomIndex);
      }
   }

   // Log the randomly selected lectures to the console for debugging
   console.log(randomFiles);

   // Call the function to display the randomly selected lectures on the webpage
   generateFileBoxes(randomFiles);
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//                             Search button                                   //
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
document.getElementById('search-btn').addEventListener('click', function () {
   const searchInput = document.getElementById('search-input');
   const searchTerm = searchInput.value.trim().toLowerCase(); // Trim spaces and convert to lowercase

   // Check if the search term is too short
   if (searchTerm.length < 3) {
      alert('Моля, въведете поне 3 букви за търсене.');
      return;
   }

   // Filter the lectures based on various fields inside `data` and `name`, `path`
   const searchResults = LectureList.filter(file => {
      // Normalize and safely access each field, considering the possibility of missing values
      const normalizeField = (field) => field ? field.toString().toLowerCase() : '';

      return normalizeField(file.name).includes(searchTerm) || // Search in the file name
             normalizeField(file.path).includes(searchTerm) || // Search in the file path
             normalizeField(file.data.title).includes(searchTerm) || // Search in the title
             normalizeField(file.data.artist).includes(searchTerm) || // Search in the artist
             normalizeField(file.data.album).includes(searchTerm) || // Search in the album
             normalizeField(file.data.genre).includes(searchTerm) || // Search in the genre
             normalizeField(file.data.year).includes(searchTerm) || // Search in the year
             normalizeField(file.data.partOfSet).includes(searchTerm) || // Search in part of set
             normalizeField(file.data.trackNumber).includes(searchTerm) || // Search in track number
             normalizeField(file.data.comment).includes(searchTerm) || // Search in the comment
             normalizeField(file.data.duration).includes(searchTerm); // Search in duration
   });

   // Display the search results on the webpage
   generateFileBoxes(searchResults);
});
