import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { TextField } from './Field.jsx';
import Button from './Button.jsx';

import "./Project.scss"
import { Chat } from './components/Chat.jsx';
import { useParams } from 'react-router-dom';

export const Project = ({ children, project = {}, user = {}, onProjectLoaded }) => {

  const [projectSlug, setProjectSlug] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showNewProject, setNewProjectVisible] = useState(true);

  const params = useParams();
  useEffect(() => {
    fetch("/api/project/"+params.id, { method: 'GET', headers: { 'Content-Type': 'application/json' }}).then((e) => {
      return e.json()
    }).then(e => {
      if (e.success) {
        setNewProjectVisible(false);
        setCurrentProject(e.project);
      }
    })
  }, [params])
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
    {showNewProject && <div className="new_project">
      <h2>Créer un projet</h2>
      <TextField label="Nom du projet" value={projectName} onChange={e => setProjectName(e.target.value)} required maxlength={100} minlength={3} help={"Choisissez un nom entre 3 et 100 caractères pour votre projet."} />
      {user.userPlan === 'premium' && (<>
          <TextField value={projectSlug} onChange={e => setProjectSlug(e.target.value)} required maxlength={100} minlength={3} help={"Choisissez un identifiant pour votre URL https://gen.primals.net/project/[id]"} />
        </>)}
      <Button  onClick={() =>{
        console.log('click');
        mutationNewProject.mutate()}}>Créer</Button>
    </div>}
    {currentProject && <><Chat project={currentProject} /></>}
  </div>
}
