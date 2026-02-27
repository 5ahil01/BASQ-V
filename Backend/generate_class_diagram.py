import ast
import os
import glob
import sys
import traceback

print("Starting class diagram generation...")

def get_python_files(directory):
    files = glob.glob(os.path.join(directory, "**/*.py"), recursive=True)
    print(f"Found {len(files)} python files in {directory}")
    return files

def generate_mermaid_class_diagram(directory, output_file):
    files = get_python_files(directory)
    
    classes = {}
    relationships = []
    
    for filepath in files:
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                tree = ast.parse(f.read(), filename=filepath)
            except Exception as e:
                print(f"Error parsing {filepath}: {e}")
                continue
                
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    class_name = node.name
                    methods = []
                    attributes = set()
                    
                    for base in node.bases:
                        if isinstance(base, ast.Name):
                            relationships.append((base.id, class_name))
                        elif isinstance(base, ast.Attribute):
                            relationships.append((base.attr, class_name))
                            
                    for class_node in node.body:
                        if isinstance(class_node, ast.FunctionDef):
                            methods.append(class_node.name)
                        elif isinstance(class_node, ast.AnnAssign):
                            if isinstance(class_node.target, ast.Name):
                                try:
                                    attributes.add(f"{class_node.target.id}: {ast.unparse(class_node.annotation)}")
                                except:
                                    attributes.add(class_node.target.id)
                        elif isinstance(class_node, ast.Assign):
                            for target in class_node.targets:
                                if isinstance(target, ast.Name):
                                    attributes.add(target.id)
                                    
                    classes[class_name] = {
                        "methods": methods,
                        "attributes": list(attributes)
                    }

    print(f"Parsed {len(classes)} classes. Writing to {output_file}...")
    try:
        with open(output_file, "w", encoding="utf-8") as out:
            out.write("```mermaid\n")
            out.write("classDiagram\n")
            
            for class_name, details in classes.items():
                out.write(f"    class {class_name} {{\n")
                for attr in details["attributes"]:
                    out.write(f"        +{attr}\n")
                for method in details["methods"]:
                    out.write(f"        +{method}()\n")
                out.write("    }\n")
                
            for base, derived in relationships:
                out.write(f"    {base} <|-- {derived}\n")
                
            out.write("```\n")
        print("Done!")
    except Exception as e:
        print(f"Failed to write file: {e}")

if __name__ == "__main__":
    try:
        generate_mermaid_class_diagram("d:/BASQ-V/Backend/app", "d:/BASQ-V/Backend/class_diagram.txt")
    except Exception as e:
        print("Fatal error:")
        traceback.print_exc()
