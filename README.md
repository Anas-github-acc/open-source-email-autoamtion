# Free Email Automation Service - Dumpmail

visit - [Dumpmail](https://dumpmail.vercel.app)

Dumpmail is an open-source email automation platform designed to run automation engine on free cron job services (such as GitHub Actions or GitLab CI/CD).

When we write free it genuinely means free
- **Free send-email scheduling** (ofc it uses your Github Scheduler Job and must not know it provide you 1000min per month if that's the case why not let put in for some uesful things)
- **Free 200 Global Leads email addresses**
- **Free Global Templates**

## Features
- Email Scheduling (Cron Job): instead of sending mail at once which will definitely flag your email address spam, schedul
e it with inbox warmup (warmup means - gradually increasing number of email you are sending daily else if you try to send 50 mails at a time it will flag you spam)
- Highly Dynamic Template: Variables definitions and rotating words, lines in emails making them highly dynamic.  
- You can see others Leads (ofc it they make them public)
- Your Upload will be Private: You can upload your leads which will be hidden from other users until you do not decide to make it public. 
- Full Control over sending engine: since automation engine [Dumpmail-Fork](https://github.com/Anas-github-acc/Dumpmail-Fork) is a open-source project, you can make anychanges as per your will   

## Template Syntax

```JavaScript
{
  lead: "Alex Leigh"
  name: "Mohd Anas"
  topic: "backend development"
  signature: "Mohd Anas\nGithub - https://github.com/Anas-github-acc\nLinkedin - https://linkedin.com/in/anas-um"
}
```

```
Hi {{ lead.split(' ')[0] }},

[["Hope you're doing well,", "Hope you're having a great week.", "Hope all is well."]]

I am {{ name }} and [["I wanted to connect regarding {{topic}}", "Reaching out about {{topic}}.", "Quick note about {{topic}}."]]

[["Interested in a quick chat?", "Open to a brief conversation?", "Worth a quick discussion?"]]

Best,
{{signature}}
```
```

### Result

```
```
Hi John,

Hope all is well.

I am Mohd Anas and Quick note about backend development.

Worth a quick discussion?

Best,
Mohd Anas
Github - [Github](https://github.com/Anas-github-acc)
Linkedin - [Linkedin](https://linkedin.com/in/anas-um)
```

### Syntax uses:
| Syntax | Description | Example |
|----------|----------|----------|
| `{{ }}` | Execute any JavaScript expression and insert its result into the template. | `{{ lead.split(' ')[0] }}`, `{{ name.toUpperCase() }}`, `{{ company || 'Unknown' }}` |
| `[[ ]]` | Randomly select one option from a list of words, phrases, or sentences. | `[["Hi", "Hello", "Hey"]]`, `[["Hope you're doing well.", "Hope all is well."]]` |

> **Note:** why do we need this `[[ ... ]]`, because gmail or yahoo mark your email if they see you are sending same mail multiple time so rotating words/lines make it more dynamic.

## Screenshots

### 1. Schedule email to send and see workflow running 
- Create campaign and schedules email
- You do not have to worry about when & how email should be send everything will be handle by engine
- See workflow runs, Disable/Unable to safe your time (which i do not think you need to stop it) 

![dashboard-to-check-and-control](https://github.com/Anas-github-acc/open-source-email-autoamtion/blob/main/assests/dashboard-to-check-and-control=github-workflow.png)

### 2. Create highly dynamic Templates or import Globally available Templates to your Library

![dynamic-template-generation-with-global-pre-generated-template-support](https://github.com/Anas-github-acc/open-source-email-autoamtion/blob/main/assests/dynamic-template-generation-with-global-pre-generated-template-support.png)

### 3. Free 200+ Globally Accessable Leads email

![Globally accessable leads](https://github.com/Anas-github-acc/open-source-email-autoamtion/blob/main/assests/200plus-leads-avaiable.png)


## Deployment Options

### Self-Hosted Dashboard

**mail me** - anas.ahamad955@gmail.com
<!-- If you want to run your own server to interface with the `dumpmail-fork` script: -->
<!---->
<!-- 1. **Clone the repository**: -->
<!--    ```bash -->
<!--    git clone https://github.com/Anas-github-acc/open-source-email-autoamtion dumpmail-www -->
<!--    cd dumpmail-www -->
<!--    ``` -->
<!---->
<!-- 2. **Configure environment variables**: -->
<!--    Copy the example environment configuration file and update the variables with your own credentials (e.g., Supabase project credentials and GitHub credentials): -->
<!--    ```bash -->
<!--    cp .env.example .env.local -->
<!--    ``` -->
<!---->
<!-- 2. **Apply supabase migration** -->
<!--    ```bash -->
<!--    supabase db push -->
<!--    ``` -->
<!--    ``` -->
<!--    ``` -->
<!---->
<!-- 3. **Install dependencies**: -->
<!--    ```bash -->
<!--    pnpm install -->
<!--    ``` -->
<!---->
<!-- 4. **Run the development server**: -->
<!--    ```bash -->
<!--    pnpm dev -->
<!--    ``` -->
<!---->
<!-- It will the start the local server on your system which will connect to your supabase services (like database, ) -->

## License

This project is licensed under the MIT License.
