import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { TextField } from './Field.jsx';
import Button from './Button.jsx';

import "./Project.scss"
import { Chat } from './components/Chat.jsx';
import { useParams } from 'react-router-dom';
import { DialogProvider } from './components/Dialog.jsx';
import { WebContainer } from '@webcontainer/api';

export const Project = ({ children, project = {}, user = {}, onProjectLoaded }) => {

  const [projectSlug, setProjectSlug] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showNewProject, setNewProjectVisible] = useState(true);

  const [webcontainer, setWebcontainer] = useState(null);
  const iframeRef = useRef(null);

  const files = Object.keys(project?.files || {});
  const mountedFiles = {};
  files.forEach((file) => {
    mountedFiles[file] = { file: { contents: project.files[file].content}};
  })
  console.log(files);

  const onFileChanged = (file, content)  => {
    webcontainer.fs.writeFile(file, content);
  }
  useEffect(() => {
    WebContainer.boot().then((wc) => {
      wc.mount(files).then(async () => {
        // install dependencies
        const installProcess = await wc.spawn('npm', ['install']);
        await installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log(data);
            }
          })
        );

        // wait for install command to exit
        return (installProcess.exit);
      }).then(code => {
        console.log(code);
        // wait for `server-ready` event
        console.log("configure");

      });
      wc.on('server-ready', (port, url) => {
        console.log("server readyl");
        iframeRef.current.src = url;
      });
      setWebcontainer(wc);
    })
  }, [])
  const params = useParams();
  useEffect(() => {
    if( !webcontainer )
      return;
    fetch("/api/project/"+params.id, { method: 'GET', headers: { 'Content-Type': 'application/json' }}).then((e) => {
      return e.json()
    }).then(e => {
      if (e.success) {
        setNewProjectVisible(false);
        setCurrentProject(e.project);
        Object.keys(e.project.files).forEach(file => {
          webcontainer.fs.writeFile(file, e.project.files[file].content);
        })
      }
    })
  }, [params, webcontainer])

  useEffect(() => {
    console.log("o")
  }, []);
  const [currentProject, setCurrentProject] = useState(project);
   const mutationNewProject = useMutation(() => {
    const project= {
      name: projectName,
    }
    return fetch("/api/project/", { method: "POST", headers: {
        'Content-Type': 'application/json'
      }, body: JSON.stringify(project)});
  }, { onSuccess: async (data) =>{
    const r = await data.json();
    if(r.success){
      setCurrentProject(r.project);
      setNewProjectVisible(false);
      onProjectLoaded?.(r.project);
      history.pushState({}, '', '/project/'+r.project.hash);
    }
     }, onError: (e) => {
     }});

  return <div className={"project"}>
    {!currentProject && <div className="new_project">
      <h2>Créer un projet</h2>
      <TextField label="Nom du projet" value={projectName} onChange={e => setProjectName(e.target.value)} required maxlength={100} minlength={3} help={"Choisissez un nom entre 3 et 100 caractères pour votre projet."} />
      {user.userPlan === 'premium' && (<>
          <TextField value={projectSlug} onChange={e => setProjectSlug(e.target.value)} required maxlength={100} minlength={3} help={"Choisissez un identifiant pour votre URL https://gen.primals.net/project/[id]"} />
        </>)}
      <Button  onClick={() =>{
        console.log('click');
        mutationNewProject.mutate()}}>Créer</Button>
    </div>}
    {currentProject && <><Chat webcontainer={webcontainer} project={currentProject} /></>}
    <iframe ref={iframeRef} width={400} height={400} style={{height:'100vh'}} />
  </div>
}
