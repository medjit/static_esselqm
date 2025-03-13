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
         loadLectures();
   }

   // Load the theme from local storage
   const savedTheme = localStorage.getItem('theme');
   if (savedTheme) {
      document.body.classList.add(`${savedTheme}-theme`);
   } else {
      document.body.classList.add('light-theme');
   }
});

let lectureList = [];
function loadLectures() {
   console.log('Loading lectures...');
   console.log(main_data);
   //load local stored data
   // Check local storage for data with tag *_data_json
   for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.endsWith('_data_json')) {
         const storedData = localStorage.getItem(key);
         if (storedData) {
            try {
               const parsedData = JSON.parse(storedData);
               lectureList = lectureList.concat(parsedData);
               console.log(`Loaded data for ${key}:`, parsedData);
            } catch (error) {
               console.error(`Error parsing data from ${key}:`, error);
            }
         }
      }
   }

   // Compare dates and print objects with newer dates in main_data
   main_data.artists.forEach(artist => {
      const localArtist = lectureList.find(local => local && local.name === artist.name);
      if (localArtist) {
         const localDate = new Date(localArtist.generated_at);
         const mainDate = new Date(artist.generated_at);

         if (mainDate > localDate) {
            console.log(`Newer data available for ${artist.name}:`, artist);
            const hostPath = main_data.artists.find(a => a.name === artist.name).path;
            loadNewDataFromHost(artist.name, hostPath);
         }
      } else {
         console.log(`No local data found for ${artist.name}.`);
          const hostPath = main_data.artists.find(a => a.name === artist.name).path;
          loadNewDataFromHost(artist.name, hostPath);
      }
   });
   console.log('Lectures loaded.');
   console.log(lectureList);
   displayRandomLectures(33);
}

function loadNewDataFromHost(artist, hostPath) {
   console.log(`Loading new data for ${artist} from ${hostPath}`);
   const script = document.createElement('script');
   script.src = hostPath;
   script.onload = function () {
      const dataVariableName = `${artist}_data`;
      const newData = window[dataVariableName];
      if (newData) {
         // Update the artist in lectureList
         const artistIndex = lectureList.findIndex(item => item.name === artist);
         if (artistIndex !== -1) {
            lectureList[artistIndex] = newData;
         } else {
            lectureList.push(newData);
         }

         // Update the artist data in local storage
         localStorage.setItem(`${artist}_data_json`, JSON.stringify(newData));
      } else {
         console.error(`Data variable ${dataVariableName} not found.`);
      }
   };
   script.onerror = function () {
      console.error(`Failed to load script from ${hostPath}`);
   };
   document.body.appendChild(script);
}

function displayRandomLectures(number = 33) {
   const randomLectures = [];
   const shuffledLectures = lectureList.flatMap(lecture => lecture.files) // Flatten all files from all lectures into one array
                                  .sort(() => 0.5 - Math.random()); // Shuffle the flattened array
   
   // Pick the random number of lectures (based on the `number` variable)
   for (let i = 0; i < Math.min(number, shuffledLectures.length); i++) {
      randomLectures.push(shuffledLectures[i]);
   }
   
   console.log('Random lectures:', randomLectures);
   generateFileBoxes(randomLectures);
   
}

//audio
// store audio progress in local storage
// restore audio progress from local storage

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
      displayRandomLectures(33);
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
