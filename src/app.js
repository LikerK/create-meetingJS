import "dotenv/config";
import { Bot, GrammyError, HttpError, Keyboard } from "grammy";
import { ref, set, onValue } from "firebase/database";
import database from "./firebase.js";
import { createMeeting, getToken, getMeeting } from "./meeting.js";

export default async () => {
  const state = {
    users: [],
    lastMeetingId: null,
    headerConfig: null,
    access_token: "",
    expires_in: null,
    createdMeeting: null,
    messages: {},
  };

  const keyboard = new Keyboard().text("Создать конференцию");

  const deleteMessages = async (chatId, ctx) => {
    if (state.messages[chatId]) {
      state.messages[chatId].forEach(async (message) => {
        try {
          await ctx.api.deleteMessage(chatId, message);
        } catch (e) {
          console.error(e);
        }
      });
    }
  };

  const addMessageId = (chatId, messageId) => {
    if (!Object.hasOwn(state.messages, chatId)) {
      state.messages[chatId] = [];
    }
    state.messages[chatId].push(messageId);
  };

  const setToken = async () => {
    const currentDate = new Date();
    if (state.expires_in !== null) {
      const diffMinutes = (state.expires_in - currentDate) / (1000 * 60);
      if (diffMinutes <= 0) {
        const token = await getToken();
        currentDate.setSeconds(currentDate.getSeconds() + token.expires_in);
        state.headerConfig = token.headerConfig;
        state.expires_in = currentDate;
        console.log("Токен заменен!");
      }
      return;
    }
    console.log("Создаю новый токен!");
    const token = await getToken();
    currentDate.setSeconds(currentDate.getSeconds() + token.expires_in);
    state.headerConfig = token.headerConfig;
    state.expires_in = currentDate;
    console.log(state);
  };

  const getMeetingMessage = (data) => {
    const id = String(data.id);
    state.lastMeetingId = data.id;
    const correctIdFormat = `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(
      -4
    )}`;
    return `${correctIdFormat}\n${data.password}\n${data.join_url}`;
  };

  const bot = new Bot(process.env.BOT_API_KEY);
  const usersRef = ref(database, "users");

  onValue(usersRef, (snapshot) => {
    console.log(snapshot.val());
    state.users = snapshot.val() ?? [];
  });

  bot.command("start", async (ctx) => {
    await ctx.reply("Привет! Я создаю конференции в Zoom", {
      reply_markup: keyboard,
    });
  });

  const handleMessage = async (text, ctx, data) => {
    const meetingInfo = getMeetingMessage(data);
    const answer = await ctx.reply(meetingInfo);
    addMessageId(ctx.chat.id, answer.message_id);
    if (text !== '') {
      const answer = await ctx.reply(text);
      addMessageId(ctx.chat.id, answer.message_id);
    }
  }

  bot.hears("Создать конференцию").filter(
    (ctx) => state.users.includes(ctx.from.id),
    async (ctx) => {
      await setToken();
      await ctx.deleteMessage();
      await deleteMessages(ctx.chat.id, ctx);
      if (state.lastMeetingId) {
        const data = await getMeeting(state.lastMeetingId, state.headerConfig);
        console.log(data);
        console.log(data.status);
        if (data.status === "started") {
          await handleMessage("Эта конеференция на данный момент используется!", ctx, data);
          return;
        }
        if (data.status === 'error') {
          const data = await createMeeting(state.headerConfig);
          await handleMessage('', ctx, data);
          return;
        }
        const currentDate = new Date();
        const startedMeetingDate = new Date(data['created_at']);
        const diffMinutes = (currentDate - startedMeetingDate) / (1000 * 60);
        if (diffMinutes < 30) {
          await handleMessage("Конференция недавно уже была создана, но в ней никого нет!", ctx, data);
          return;
        } 
      }
      const data = await createMeeting(state.headerConfig);
      await handleMessage('', ctx, data);
    }
  );

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });

  bot.start();
};
