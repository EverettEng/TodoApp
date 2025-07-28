# Todo App

Full-stack app created by Everett Eng as an introduction to full stack development using FastAPI and React.js.  
  
## App Pages
- Sign Up
  - Create new accounts
  - Usernames have minimum of 3 characters and a maximum of 20
  - Passwords have a minimum length of 8 characters and a max of 72 so that bcrypt hashes all of it
- Log In
- Home Page 
  - Brief description of the app and links to Github and Linkedin
- Todos page 
  - Create todos 
  - View todos
  - Todos are sorted first by completion (Complete, Incomplete, Overdue), then by due date.
  - Edit and delete todos
  - Toggle completion of todos
- Profile
  - View number of complete, incomplete, and overdue todos
  - Permanently delete account

## Stack Used
**Frontend**: React.js  
**Backend**: FastAPI  
**ORM**: SQLAlchemy  
**Database**: PostgreSQL
