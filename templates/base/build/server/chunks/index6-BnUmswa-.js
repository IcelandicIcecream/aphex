import { L as List_todo } from './list-todo-oKtgC1b1.js';

const todo = {
  type: "document",
  name: "todo",
  title: "Todo",
  description: "A simple todo item",
  icon: List_todo,
  fields: [
    {
      name: "title",
      type: "string",
      title: "Title",
      description: "Todo title",
      validation: (Rule) => Rule.required().max(200)
    },
    {
      name: "description",
      type: "text",
      title: "Description",
      description: "Optional description",
      rows: 3
    },
    {
      name: "completed",
      type: "boolean",
      title: "Completed",
      description: "Mark as completed",
      initialValue: false
    }
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description"
    }
  }
};
const schemaTypes = [todo];

export { schemaTypes as s };
//# sourceMappingURL=index6-BnUmswa-.js.map
