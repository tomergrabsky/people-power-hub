const fs = require('fs');

const path = 'src/pages/Employees.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. SortField
content = content.replace(
  /type SortField = 'full_name' \| 'birth_date' \| 'job_role_id' \| 'project_id'/,
  "type SortField = 'full_name' | 'birth_date' | 'job_role_id' | 'project_id' | 'recruitment_plan_id'"
);

// 2. Employee interface
content = content.replace(
  /project_id: string \| null;/,
  "project_id: string | null;\n  recruitment_plan_id?: string | null;"
);

// 3. Project interface area, add RecruitmentPlan
content = content.replace(
  /interface Project \{\n  id: string;\n  name: string;\n\}/,
  "interface Project {\n  id: string;\n  name: string;\n}\n\ninterface RecruitmentPlan {\n  id: string;\n  name: string;\n}"
);

// 4. state variables
content = content.replace(
  /const \[projects, setProjects\] = useState<Project\[\]>\(\[\]\);/,
  "const [projects, setProjects] = useState<Project[]>([]);\n  const [recruitmentPlans, setRecruitmentPlans] = useState<RecruitmentPlan[]>([]);"
);

// 5. filter states
content = content.replace(
  /const \[filterProject, setFilterProject\] = useState<string\[\]>\(\[\]\);/,
  "const [filterProject, setFilterProject] = useState<string[]>([]);\n  const [filterRecruitmentPlan, setFilterRecruitmentPlan] = useState<string[]>([]);"
);

// 6. visible columns
content = content.replace(
  /project_id: true,/,
  "project_id: true,\n    recruitment_plan_id: false,"
);

// 7. column labels
content = content.replace(
  /project_id: 'תכנית\/קבלן משנה',/,
  "project_id: 'תכנית/קבלן משנה',\n    recruitment_plan_id: 'קבלן משנה/תכנית גיוס',"
);

// 8. default column order
content = content.replace(
  /'project_id',/,
  "'project_id', 'recruitment_plan_id',"
);

// 9. default field order
content = content.replace(
  /'row_project_branch',/,
  "'row_project_branch', 'row_recruitment_plan',"
);

// 10. formData keys
content = content.replace(
  /project_id: '',/g,
  "project_id: '',\n    recruitment_plan_id: '',"
);

// 11. fetchData 
content = content.replace(
  /getDocs\(collection\(db, 'projects'\)\),/,
  "getDocs(collection(db, 'projects')),\n        getDocs(collection(db, 'recruitment_plans')),"
);

content = content.replace(
  /companiesSnap, branchesSnap, senioritySnap, leavingSnap, performanceSnap/,
  "recruitmentPlansSnap, companiesSnap, branchesSnap, senioritySnap, leavingSnap, performanceSnap"
);

content = content.replace(
  /setProjects\(mapDocs\(projectsSnap\)\);/,
  "setProjects(mapDocs(projectsSnap));\n      setRecruitmentPlans(mapDocs(recruitmentPlansSnap));"
);

// 12. getProjectName helper -> add getRecruitmentPlanName
content = content.replace(
  /const getProjectName = \(projectId: string \| null\) => \{([^}]+)\};/,
  "const getProjectName = (projectId: string | null) => {$1};\n\n  const getRecruitmentPlanName = (planId: string | null | undefined) => {\n    if (!planId) return '-';\n    const plan = recruitmentPlans.find(p => p.id === planId);\n    return plan?.name || '-';\n  };"
);

// 13. filteredEmployees logic
content = content.replace(
  /const matchesProject = filterProject.length === 0 \|\| \(emp.project_id && filterProject.includes\(emp.project_id\)\);/,
  "const matchesProject = filterProject.length === 0 || (emp.project_id && filterProject.includes(emp.project_id));\n    const matchesRecruitmentPlan = filterRecruitmentPlan.length === 0 || (emp.recruitment_plan_id && filterRecruitmentPlan.includes(emp.recruitment_plan_id));"
);

content = content.replace(
  /matchesBranch && matchesEmployingCompany/,
  "matchesRecruitmentPlan && matchesBranch && matchesEmployingCompany"
);

// 14. sortedEmployees logic
content = content.replace(
  /case 'project_id':([^k]+)break;/,
  "case 'project_id':$1break;\n      case 'recruitment_plan_id':\n        aValue = getRecruitmentPlanName(a.recruitment_plan_id).toLowerCase();\n        bValue = getRecruitmentPlanName(b.recruitment_plan_id).toLowerCase();\n        break;"
);

// 15. handleAdd insertData
content = content.replace(
  /project_id: formData.project_id \|\| null,/,
  "project_id: formData.project_id || null,\n      recruitment_plan_id: formData.recruitment_plan_id || null,"
);

// 16. filter section UI 
content = content.replace(
  /<div className="space-y-2">\n\s*<Label>תכנית\/קבלן משנה<\/Label>(.*?)<\/MultiSelect>\n\s*<\/div>/s,
  `$&
              <div className="space-y-2">
                <Label>קבלן משנה/תכנית גיוס</Label>
                <MultiSelect
                  options={recruitmentPlans.map(p => ({ label: p.name, value: p.id }))}
                  value={filterRecruitmentPlan}
                  onChange={setFilterRecruitmentPlan}
                  placeholder="בחר תכנית גיוס..."
                />
              </div>`
);

// 17. Excel export logic
content = content.replace(
  /project_id: getProjectName\(emp.project_id\),/,
  "project_id: getProjectName(emp.project_id),\n        recruitment_plan_id: getRecruitmentPlanName(emp.recruitment_plan_id),"
);

// 18. form data in edit 
content = content.replace(
  /project_id: employee.project_id \|\| '',/,
  "project_id: employee.project_id || '',\n      recruitment_plan_id: employee.recruitment_plan_id || '',"
);

// 19. table cells
// Wait, table body logic is complex, it loops through orderedVisibleColumns.
content = content.replace(
  /case 'project_id':\n\s*val = getProjectName\(emp.project_id\);\n\s*break;/,
  "case 'project_id':\n                              val = getProjectName(emp.project_id);\n                              break;\n                            case 'recruitment_plan_id':\n                              val = getRecruitmentPlanName(emp.recruitment_plan_id);\n                              break;"
);

// 20. form field rendering
// The form field rendering uses DraggableFormContainer which wraps segments.
// There is a <DraggableFormContainer containerId="row_project_branch"...
content = content.replace(
  /<DraggableFormContainer containerId="row_project_branch"[^>]*>([\s\S]*?)<\/DraggableFormContainer>/,
  `$&
                      <DraggableFormContainer containerId="row_recruitment_plan" activeTab={activeTab} setActiveTab={setActiveTab}>
                        <div className="space-y-2">
                          <Label htmlFor="recruitment_plan_id">קבלן משנה/תכנית גיוס</Label>
                          <Select
                            value={formData.recruitment_plan_id}
                            onValueChange={(val) => setFormData({ ...formData, recruitment_plan_id: val === 'none' ? '' : val })}
                          >
                            <SelectTrigger id="recruitment_plan_id">
                              <SelectValue placeholder="בחר תכנית גיוס" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">ללא תכנית גיוס</SelectItem>
                              {recruitmentPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </DraggableFormContainer>`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched successfully");
