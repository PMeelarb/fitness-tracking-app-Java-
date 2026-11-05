import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

// ==========================================
// ส่วนที่ 1: Model Classes 
// ========================================== นี่คือคลาสแม่ที่ลืบทอด
abstract class Exercise {
    protected String name;
    protected String type; // "Weight" หรือ "Cardio"

    public Exercise(String name, String type) {
        this.name = name;
        this.type = type;
    }

    public String getName() { return name; }
    
    // Abstract method (Polymorphism)
    public abstract String getDetails(); 
}
//ส่วนของ การลืบทอด inheritance
class WeightTraining extends Exercise {
    private int sets, reps;
    private double weight;

    public WeightTraining(String name, int sets, int reps, double weight) {
        super(name, "Weight");
        this.sets = sets;
        this.reps = reps;
        this.weight = weight;
    }

    @Override
    public String getDetails() {
        return sets + " sets, " + reps + " reps, " + weight + " kg";
    }
}

class Cardio extends Exercise {
    private int durationMinutes;

    public Cardio(String name, int durationMinutes) {
        super(name, "Cardio");
        this.durationMinutes = durationMinutes;
    }

    @Override
    public String getDetails() {
        return durationMinutes + " นาที";
    }
}

// ==========================================
// ส่วนที่ 2: Manager Class (Logic หลัก)
// ==========================================
class ScheduleManager {
    // 1. Aggregation//composition: Manager "มี" List ของ Exercise
    private List<Exercise> exercises = new ArrayList<>();
    private final String FILE_NAME = "schedule_data.txt";

    public ScheduleManager() {
        loadFromFile(); // 2. File Input (โหลดข้อมูลทันทีที่เริ่มโปรแกรม)
    }

    public void addExercise(Exercise ex) {
        exercises.add(ex);
        saveToFile(); // บันทึกทันทีเมื่อเพิ่ม
    }

    public List<Exercise> getAllExercises() {
        return exercises;
    }

    // 3. Data Sorting (Bubble Sort) - เรียงตามชื่อ ตามตัวอักษร
    public void sortExercises() {
        int n = exercises.size();
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (exercises.get(j).getName().compareToIgnoreCase(exercises.get(j + 1).getName()) > 0) {
                    Exercise temp = exercises.get(j);
                    exercises.set(j, exercises.get(j + 1));
                    exercises.set(j + 1, temp);
                }
            }
        }
    }

    // Data Searching - ค้นหาข้อมูล
    // แก้ไขให้ค้นหาง่ายขึ้น: พิมพ์แค่บางส่วนก็เจอ (contains)
    public Exercise searchExercise(String keyword) {
        for (Exercise ex : exercises) {
            // แปลงเป็นตัวเล็กก่อนเทียบ จะได้ไม่ต้องกังวลเรื่องพิมพ์ใหญ่/เล็ก
            if (ex.getName().toLowerCase().contains(keyword.toLowerCase())) {
                return ex; // เจอแล้ว! ส่งข้อมูลกลับ
            }
        }
        return null; // ไม่เจอ
    }

    // File Output
    public void saveToFile() {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(FILE_NAME, StandardCharsets.UTF_8))) {
            for (Exercise ex : exercises) {
                // Format: Type|Name|Details
                writer.write(ex.type + "|" + ex.getName() + "|" + ex.getDetails());
                writer.newLine();
            }
        } catch (IOException e) { e.printStackTrace(); }
    }

    // File Input
    public void loadFromFile() {
        File file = new File(FILE_NAME);
        if (!file.exists()) return;
        exercises.clear();
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\\|");
                if (parts.length < 3) continue;
                
                String type = parts[0];
                String name = parts[1];
                String details = parts[2];

                if (type.equals("Weight")) {
                    try {
                        String[] d = details.split(" "); 
                        int s = Integer.parseInt(d[0]);
                        int r = Integer.parseInt(d[2]);
                        double w = Double.parseDouble(d[4]);
                        exercises.add(new WeightTraining(name, s, r, w));
                    } catch (Exception e) {}
                } else if (type.equals("Cardio")) {
                    try {
                        int min = Integer.parseInt(details.split(" ")[0]);
                        exercises.add(new Cardio(name, min));
                    } catch (Exception e) {}
                }
            }
        } catch (IOException e) { e.printStackTrace(); }
    }
}

// ==========================================
// ส่วนที่ 3: Main Server
// ==========================================
public class FitnessAppServer {
    private static ScheduleManager manager = new ScheduleManager();

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // API Endpoints
        server.createContext("/api/exercises", t -> {
            manager.sortExercises(); // Sort ทุกครั้งที่เรียกดู
            
            // ตรวจสอบว่ามีการส่งคำค้นหามาหรือไม่ ?search=...
            String query = t.getRequestURI().getQuery();
            String keyword = "";
            if (query != null && query.contains("search=")) {
                keyword = query.split("search=")[1];
            }

            StringBuilder json = new StringBuilder("[");
            
            if (!keyword.isEmpty()) {
                // ถ้ามีคำค้นหา ให้ใช้ฟังก์ชัน Search
                Exercise found = manager.searchExercise(keyword);
                if (found != null) {
                   json.append(String.format("{\"name\":\"%s\",\"details\":\"%s\",\"type\":\"%s\"}", 
                        found.getName(), found.getDetails(), found.type));
                }
            } else {
                // ถ้าไม่มีคำค้นหา ให้ส่งไปทั้งหมด
                List<Exercise> list = manager.getAllExercises();
                for(int i=0; i<list.size(); i++) {
                    Exercise ex = list.get(i);
                    json.append(String.format("{\"name\":\"%s\",\"details\":\"%s\",\"type\":\"%s\"}", 
                        ex.getName(), ex.getDetails(), ex.type));
                    if(i < list.size()-1) json.append(",");
                }
            }
            json.append("]");
            
            byte[] b = json.toString().getBytes(StandardCharsets.UTF_8);
            t.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            t.sendResponseHeaders(200, b.length);
            t.getResponseBody().write(b);
            t.getResponseBody().close();
        });

        server.createContext("/api/add", t -> {
            if ("POST".equals(t.getRequestMethod())) {
                String body = new BufferedReader(new InputStreamReader(t.getRequestBody(), StandardCharsets.UTF_8)).readLine();
                String[] parts = body.split("\\|");
                if(parts[0].equals("Weight")) {
                    manager.addExercise(new WeightTraining(parts[1], 
                        Integer.parseInt(parts[2]), Integer.parseInt(parts[3]), Double.parseDouble(parts[4])));
                } else {
                    manager.addExercise(new Cardio(parts[1], Integer.parseInt(parts[2])));
                }
                String resp = "{\"status\":\"saved\"}";
                t.sendResponseHeaders(200, resp.length());
                t.getResponseBody().write(resp.getBytes());
                t.getResponseBody().close();
            }
        });
        
        server.createContext("/", t -> {
            String path = t.getRequestURI().getPath().equals("/") ? "/index.html" : t.getRequestURI().getPath();
            File file = new File("." + path);
            if (file.exists()) {
                t.sendResponseHeaders(200, file.length());
                OutputStream os = t.getResponseBody();
                Files.copy(file.toPath(), os);
                os.close();
            } else {
                t.sendResponseHeaders(404, -1); t.close();
            }
        });

        server.setExecutor(null);
        System.out.println(">>> Server running at: http://localhost:8080");
        
        // --- ส่วนทดสอบ (Test) ---
        // ใส่ข้อมูลตัวอย่างให้อัตโนมัติ ถ้าไฟล์ยังว่างอยู่
        if(manager.getAllExercises().isEmpty()) {
            manager.addExercise(new WeightTraining("Bench Press", 4, 12, 40.0));
            manager.addExercise(new Cardio("Morning Run", 30));
            System.out.println("[System] Added dummy data for testing.");
        }
        
        System.out.println(">>> Testing Search Function: Searching for 'Bench'...");
        Exercise result = manager.searchExercise("Bench");
        if(result != null) {
            System.out.println("    [FOUND] " + result.getName() + " -> " + result.getDetails());
        } else {
            System.out.println("    [NOT FOUND]");
        }
        
        server.start();
    }
}