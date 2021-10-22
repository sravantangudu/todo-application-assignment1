const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");
let database = null;

const app = express();
app.use(express.json());

initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Db server : ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: format(new Date(dbObject.due_date), "yyyy-MM-dd"),
  };
};

app.get("/todos/", async (request, response) => {
  let { status, priority, search_q, category } = request.query;
  let todoArray = "";
  let getTodoQuery = "";
  switch (true) {
    case status !== undefined && category !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                status LIKE "${status}" AND
                category LIKE "${category}";`;
      todoArray = await database.all(getTodoQuery);
      response.send(
        todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
      break;
    case priority !== undefined && category !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                priority LIKE "${priority}" AND
                category LIKE "${category}";`;
      todoArray = await database.all(getTodoQuery);

      response.send(
        todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
      break;

    case status !== undefined && priority !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                status LIKE "${status}" AND
                priority LIKE "${priority}";`;
      todoArray = await database.all(getTodoQuery);
      response.send(
        todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
      break;

    case status !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                  status LIKE "${status}";`;
      todoArray = await database.all(getTodoQuery);

      if (todoArray === "") {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        response.send(
          todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
      }
      break;

    case priority !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                priority LIKE "${priority}";`;
      todoArray = await database.all(getTodoQuery);

      if (todoArray === "") {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        response.send(
          todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
      }
      break;

    case category !== undefined:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                category LIKE "${category}";`;
      todoArray = await database.all(getTodoQuery);

      if (todoArray === "") {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        response.send(
          todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
      }
      break;

    default:
      getTodoQuery = `
            SELECT
                *
            FROM
                todo
            WHERE
                todo LIKE "%${search_q}%";`;
      todoArray = await database.all(getTodoQuery);
      response.send(
        todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todo));
});

app.get("/agenda/", async (request, response) => {
  let date = format(new Date(2021, 1, 22), "yyyy-MM-dd");
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      due_date = ${date};`;
  const todo = await database.all(getTodoQuery);
  if (todo !== undefined) {
    response.send(
      todo.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const date = format(new Date(dueDate), "yyyy-MM-dd");
  switch (true) {
    case status !== "TO DO" && status !== "PROGRESS" && status !== "DONE":
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW":
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case category !== "WORK" && category !== "LEARNING" && category !== "HOME":
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case isValid(new Date(dueDate)) === false:
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      const postTodoQuery = `
            INSERT INTO
                todo (id, todo, priority, status, category, due_date)
            VALUES
                (${id}, '${todo}', '${priority}', '${status}', "${category}", ${date});`;
      await database.run(postTodoQuery);
      console.log("todo added");
      response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  switch (true) {
    case status !== "TO DO" && status !== "PROGRESS" && status !== "DONE":
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW":
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case category !== "WORK" && category !== "LEARNING" && category !== "HOME":
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case isValid(new Date(dueDate)) === false:
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      const updateTodoQuery = `
        UPDATE
            todo
        SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${dueDate}'
        WHERE
            id = ${todoId};`;
      await database.run(updateTodoQuery);
      response.send(`${updateColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
