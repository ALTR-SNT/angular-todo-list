import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';

type Priority = 'low' | 'medium' | 'high';
type Filter = 'all' | 'completed' | 'pending';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  userId: number;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://jsonplaceholder.typicode.com/todos';

  protected readonly title = signal('Todo on Angular');
  protected readonly todos = signal<Todo[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');


  protected newTodoText = signal('');
  protected newTodoPriority = signal<Priority>('medium');


  protected currentFilter = signal<Filter>('all');
  protected sortByPriority = signal(false);


  protected editingId = signal<number | null>(null);
  protected editText = signal('');
  protected editPriority = signal<Priority>('medium');

  ngOnInit() {
    this.loadTodos();
  }

  protected async loadTodos() {
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await fetch(this.API_URL + '?_limit=10');
      const apiTodos = await response.json();

      const todosWithPriority = apiTodos.map((todo: any) => ({
        ...todo,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Priority
      }));

      this.todos.set(todosWithPriority);
    } catch (err) {
      this.error.set('Failed to load todos');
      console.error('Error loading todos:', err);
    } finally {
      this.loading.set(false);
    }
  }

  protected async addTodo() {
    const text = this.newTodoText().trim();
    if (!text) return;

    this.loading.set(true);

    try {
      const newTodo = {
        title: text,
        completed: false,
        priority: this.newTodoPriority(),
        userId: 1
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      });

      if (response.ok) {
        const createdTodo = await response.json();
        const todoWithPriority = { ...createdTodo, priority: this.newTodoPriority() };

        this.todos.update(current => [...current, todoWithPriority]);
        this.newTodoText.set('');
        this.newTodoPriority.set('medium');
      }
    } catch (err) {
      this.error.set('Failed to add todo');
      console.error('Error adding todo:', err);
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleTodo(todo: Todo) {
    try {
      const response = await fetch(`${this.API_URL}/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });

      if (response.ok) {
        this.todos.update(current =>
          current.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t)
        );
      }
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  }

  protected async deleteTodo(id: number) {
    try {
      const response = await fetch(`${this.API_URL}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.todos.update(current => current.filter(todo => todo.id !== id));
      }
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  }

  protected startEdit(todo: Todo) {
    this.editingId.set(todo.id);
    this.editText.set(todo.title);
    this.editPriority.set(todo.priority);
  }

  protected cancelEdit() {
    this.editingId.set(null);
    this.editText.set('');
  }

  protected async saveEdit() {
    const id = this.editingId();
    if (!id) return;

    try {
      const response = await fetch(`${this.API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: this.editText(),
          priority: this.editPriority()
        })
      });

      if (response.ok) {
        this.todos.update(current =>
          current.map(todo =>
            todo.id === id
              ? { ...todo, title: this.editText(), priority: this.editPriority() }
              : todo
          )
        );
        this.cancelEdit();
      }
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  }

  protected filteredAndSortedTodos() {
    let filtered = this.todos();
    const filter = this.currentFilter();
    if (filter === 'completed') {
      filtered = filtered.filter(todo => todo.completed);
    } else if (filter === 'pending') {
      filtered = filtered.filter(todo => !todo.completed);
    }

    if (this.sortByPriority()) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      filtered = [...filtered].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    }

    return filtered;
  }

  protected getPriorityClass(priority: Priority): string {
    return `priority-${priority}`;
  }
}
