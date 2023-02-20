const { Server } = require('socket.io');
const io = new Server(3001);
const { EVENT_NAMES } = require('./utils');
//Going to get questions from SQS and send to players using inquirer format
// const { questionsReady } = require("./questionsQueue/index");
const inquirer = require('inquirer');
const prompts = require('./prompt')
const { handleNavigation } = require('./src/navigation/navigation')

// async function welcome() {
//   const title = await inquirer.prompt({
//     name: 'welcomeMessage',
//     message: 'Welcome to Sneaky Snacker! Would you like to start a new game?',
//     type: 'list',
//     choices: ['Yes', 'No'],
//     //If yes, instantiate game instance; if no, escape to home.
//   });
// }

let answerCount = 0;

const welcomePrompt = {
  name: 'gameplay',
  message: 'Welcome to Sneaky Snacker! Would you like to start a new game?',
  type: 'list',
  choices: ['Yes', 'No'],
}

const gamePrompt = {
  name: 'gameplay',
  message: 'You are currently playing as the child. You will be given options to navigate throughout the house. The goal is to reach the snacks before dad catches you.',
  type: 'list',
  choices: ['Ok', 'Quit']
}



function startEventServer() {
  io.on('connection', (socket) => {
    console.log('We have a new connection:', socket.id);

    socket.on(EVENT_NAMES.playerReady, (player) => {
      console.log(`${player} is ready!`);
      io.emit(EVENT_NAMES.questionsReady, welcomePrompt);
    });

    socket.on(EVENT_NAMES.answer, (answer) => {
      if (answer.gameplay === 'Yes'){
        answerCount += 1;
        io.emit(EVENT_NAMES.questionsReady, gamePrompt);
      } else if (answer.gameplay === 'No'){
        io.emit(EVENT_NAMES.questionsReady, welcomePrompt);
      }
      if (answerCount === 1){
        if (answer.gameplay === 'Ok'){
          answerCount += 1;
          io.emit(EVENT_NAMES.questionsReady, prompts[1])
          if (answer.gameplay === 'Navigate') {
            const navigate = {
              name: 'navigate',
              message: 'Select the room you want to go to',
              type: 'list',
              choices: ["Go to bathroom","Go to hallway"]
            }
            console.log()
            io.emit(EVENT_NAMES.questionsReady, navigate) 
            handleNavigation()
            // io.emit(EVENT_NAMES)
          }
        } else if (answer.gameplay === 'Quit'){
          io.emit(EVENT_NAMES.questionsReady, welcomePrompt);
        }
      }
    });
  });
}

startEventServer();
// Sends user direction

