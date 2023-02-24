const { Server } = require('socket.io');
const io = new Server(3001);
const { EVENT_NAMES } = require('./src/utils');
const inquirer = require('inquirer');
const prompts = require('./src/prompt');
const dogPrompts = require('./src/prompt-dog');
const { handleSearch, handleDogSearch } = require('./src/search/search');
const {
  handleChildDistraction,
  handleEvent,
  handleDogDistraction,
  handleDogEvent,
} = require('./src/distraction/distraction');
const gameData = require('./src/game.json');
const { winCondition } = require('./src/cookieJar');
const chance = require('chance')();
const {
  handleNavigation,
  handleNPCNavigation,
} = require('./src/navigation/navigation');
const NPC = require('./src/npc');

const rooms = [
  'kidsroom',
  'bathroom',
  'parentsroom',
  'hallway',
  'kitchen',
  'livingroom',
  'garage',
];

let currentRoom = 'kidsroom';
let dogCurrentRoom = 'kidsroom';
let dadCurrentRoom = 'livingroom';
let playerBase = 15;
// add to modifier when player picks up item & distracts
let playerModifier = 10;
let dogBase = 15;
let dogModifier = 10;
let dadBase = 15;
let dadModifier = 10;

const welcomePrompt = {
  name: 'gameplay',
  message: 'Welcome to Sneaky Snacker! Would you like to start a new game?',
  type: 'list',
  choices: ['Yes', 'No'],
};

const gamePrompt = {
  name: 'gameplay',
  message:
    'You are currently playing as Melis, the child. You will be given options to navigate throughout the house, search for objects, and create distractions. Your goal is to reach the snacks before dad catches you.',
  type: 'list',
  choices: ['Ok'],
};

const dogPrompt = {
  name: 'gameplay',
  message:
    "You are now playing as Melis's dog, Diego. You will be given options to navigate throughout the house, search for objects, and create distractions. Your goal is to help Melis get cookies while avoiding being caught by dad. ",
  type: 'list',
  choices: ['Ok'],
};

function onChildReady(player) {
  console.log(`Melis is ready!`, player.id);
  player.emit(EVENT_NAMES.questionsReady, welcomePrompt);
}

function onDogReady(dog) {
  console.log(`Diego is ready!`, dog.id);
  dog.emit(EVENT_NAMES.dogQuestions, welcomePrompt);
}

function choice(answer) {
  gameChoices = {
    ok: answer.gameplay === 'Ok',
    yes: answer.gameplay === 'Yes',
    navigate: answer.gameplay === 'Navigate',
    distraction: answer.gameplay === 'Distraction',
    distract: answer.gameplay === 'Distract',
    dontDistract: answer.gameplay === "Don't Distract",
    search: answer.gameplay === 'Search',
    cookieJar: answer.gameplay === 'Cookie Jar',
    quit: answer.gameplay === 'No',
  };
  return gameChoices;
}
let socketConnections = 0;
function startEventServer() {
  

  io.on('connection', (socket) => {
    

    socket.on(EVENT_NAMES.childReady, () => {
      onChildReady(socket);
      socketConnections++;
    });
    socket.on(EVENT_NAMES.dogReady, () => {
      onDogReady(socket);
      socketConnections++;
    });

    socket.on(EVENT_NAMES.selection, (answer) => {
      if (choice(answer).yes) {
        io.emit(EVENT_NAMES.questionsReady, gamePrompt);
      }
      if (choice(answer).ok) {
        io.emit(EVENT_NAMES.questionsReady, prompts[0]);
      }
      if (choice(answer).navigate) {
        console.log(currentRoom);
        const navigatePrompt = {
          name: 'gameplay',
          message: 'Where would you like to go?',
          type: 'list',
          choices: handleNavigation(currentRoom),
        };
        io.emit(EVENT_NAMES.questionsReady, navigatePrompt);
      }
      if (rooms.includes(answer.gameplay)) {
        let room = prompts.find((obj) => obj.id === answer.gameplay);
        io.emit(EVENT_NAMES.questionsReady, room);
        currentRoom = answer.gameplay;
        console.log(currentRoom);
      }
      if (choice(answer).distraction) {
        const distraction = {
          name: 'gameplay',
          message: handleChildDistraction(currentRoom),
          type: 'list',
          choices: ['Distract', "Don't Distract"],
        };
        io.emit(EVENT_NAMES.questionsReady, distraction);
      }
      if (choice(answer).distract) {
        let itemScore =
          gameData.rooms[currentRoom].distractions.triggers.effect.scoreUpdate;
        playerModifier += itemScore;
        console.log(playerModifier, " Player Modifier Score");
        let room = prompts.find((obj) => obj.id === currentRoom);
        io.emit(EVENT_NAMES.message, handleEvent(currentRoom));
        let moveNPC = handleNPCNavigation(currentRoom);
        const randomEventCheck = Math.random();
        console.log(randomEventCheck, " Random Event Check - 80% Pass/20% Fail");
        randomEventCheck < 0.8
          ? io.emit(EVENT_NAMES.questionsReady, room)
          : io.emit(EVENT_NAMES.questionsReady, NPC(currentRoom, moveNPC));
      }
      if (choice(answer).dontDistract) {
        let room = prompts.find((obj) => obj.id === currentRoom);
        io.emit(EVENT_NAMES.questionsReady, room);
      }
      if (choice(answer).search) {
        const searchPrompt = {
          name: 'gameSearch',
          message: handleSearch(currentRoom),
          type: 'confirm',
        };
        io.emit(EVENT_NAMES.questionsReady, searchPrompt);
      }
      if (answer.gameSearch === true) {
        io.emit(
          EVENT_NAMES.message,
          gameData.rooms[currentRoom].Search.obtained
        );
        gameData.rooms[currentRoom].Search.pickedup === true;
        let itemScore =
          gameData.rooms[currentRoom].Search.triggers.effect.scoreUpdate;
        playerModifier += itemScore;
        console.log(playerModifier, " Player Modifier Score");
        const navigatePrompt = {
          name: 'gameplay',
          message: 'Where would you like to go?',
          type: 'list',
          choices: handleNavigation(currentRoom),
        };
        io.emit(EVENT_NAMES.questionsReady, navigatePrompt);
      }
      if (answer.gameSearch === false) {
        const navigatePrompt = {
          name: 'gameplay',
          message: 'Where would you like to go?',
          type: 'list',
          choices: handleNavigation(currentRoom),
        };
        io.emit(EVENT_NAMES.questionsReady, navigatePrompt);
      }
      if (choice(answer).cookieJar) {
        socketConnections >= 2 ? 
        io.emit(EVENT_NAMES.questionsReady, winCondition(playerModifier, dogModifier)) 
        : io.emit(EVENT_NAMES.questionsReady, winCondition(playerModifier));
        
        currentRoom = 'kidsroom';
      }
      if (choice(answer).quit) {
        io.emit(EVENT_NAMES.quit, 'Quit');
      }
    });

    socket.on(EVENT_NAMES.dogSelection, (answer) => {
      const handleDog = handleGameplayDogSelection(
        answer,
        dogPrompt,
        dogCurrentRoom
      );
      if (handleDog) {
        const [eventName, eventData] = handleDog;
        io.emit(eventName, eventData);
      }
      if (rooms.includes(answer.gameplay)) {
        let room = dogPrompts.find((obj) => obj.id === answer.gameplay);
        io.emit(EVENT_NAMES.dogQuestions, room);
        dogCurrentRoom = answer.gameplay;
      }
      if (choice(answer).distraction) {
        const dogDistraction = {
          name: 'gameplay',
          message: handleDogDistraction(dogCurrentRoom),
          type: 'list',
          choices: ['Distract', "Don't Distract"],
        };
        io.emit(EVENT_NAMES.dogQuestions, dogDistraction);
      }
      if (choice(answer).distract) {
        let itemScore =
          gameData.rooms[dogCurrentRoom].dogdistractions.triggers.effect
            .scoreUpdate;
        dogModifier += itemScore;
        console.log(dogModifier, " Dog Modifier Score");
        let room = dogPrompts.find((obj) => obj.id === dogCurrentRoom);
        io.emit(EVENT_NAMES.dogMessage, handleDogEvent(dogCurrentRoom));
        let moveNPC = handleNPCNavigation(dogCurrentRoom);
        const randomEventCheck = Math.random();
        console.log(randomEventCheck, " Random Event Check - 80% Pass/20% Fail");
        randomEventCheck < 0.8
          ? io.emit(EVENT_NAMES.dogQuestions, room)
          : io.emit(EVENT_NAMES.dogQuestions, NPC(dogCurrentRoom, moveNPC));
      }
      if (choice(answer).dontDistract) {
        let room = dogPrompts.find((obj) => obj.id === dogCurrentRoom);
        io.emit(EVENT_NAMES.dogQuestions, room);
      }
      if (choice(answer).search) {
        const searchPrompt = {
          name: 'gameSearch',
          message: handleDogSearch(dogCurrentRoom),
          type: 'confirm',
        };
        io.emit(EVENT_NAMES.dogQuestions, searchPrompt);
      }
      if (answer.gameSearch === true) {
        io.emit(
          EVENT_NAMES.dogMessage,
          gameData.rooms[dogCurrentRoom].dogSearch.obtained
        );
        gameData.rooms[dogCurrentRoom].dogSearch.pickedup === true;
        let itemScore =
          gameData.rooms[dogCurrentRoom].dogSearch.triggers.effect.scoreUpdate;
        dogModifier += itemScore;
        console.log(dogModifier, " Dog Modifier Score");
        const navigatePrompt = {
          name: 'gameplay',
          message: 'Where would you like to go?',
          type: 'list',
          choices: handleNavigation(dogCurrentRoom),
        };
        io.emit(EVENT_NAMES.dogQuestions, navigatePrompt);
      }
      if (answer.gameSearch === false) {
        const navigatePrompt = {
          name: 'gameplay',
          message: 'Where would you like to go?',
          type: 'list',
          choices: handleNavigation(dogCurrentRoom),
        };
        io.emit(EVENT_NAMES.dogQuestions, navigatePrompt);
      }
      if (choice(answer).cookieJar) {
        io.emit(EVENT_NAMES.dogQuestions, winCondition(playerModifier, dogModifier));
        dogCurrentRoom = 'kidsroom';
      }
      if (choice(answer).quit) {
        io.emit(EVENT_NAMES.quit, 'Quit');
      }
    });
  });
}

function handleGameplayDogSelection(
  answer,
  dogPrompt,
  dogCurrentRoom
) {
  if (choice(answer).yes) {
    return [EVENT_NAMES.dogQuestions, dogPrompt];
  }
  if (choice(answer).ok) {
    const helpMelis = {
      name: 'gameplay',
      message: `Melis is currently in the ${currentRoom}. What would you like to do?`,
      type: 'list',
      choices: ['Navigate', 'Search', 'Distraction'],
    };
    return [EVENT_NAMES.dogQuestions, helpMelis];
    
  }
  if (choice(answer).navigate) {
    const navigatePrompt = {
      name: 'gameplay',
      message: 'Where would you like to go?',
      type: 'list',
      choices: handleNavigation(dogCurrentRoom),
    };
    return [EVENT_NAMES.dogQuestions, navigatePrompt];
  }
}

startEventServer();